#!/usr/bin/env python3
"""Generate a Reborn v3 extension manifest from a tool's capabilities artifact.

IronClaw installs an extension from a `manifest.toml` describing the runtime,
its model-callable tools, the credentials those tools need, and an auth recipe
per credential vendor. Until now IronHub published only `<tool>.capabilities.json`
and IronClaw reconstructed the manifest itself by string-building TOML from a
schema it does not own. That translation lost fields silently (credentials, then
the auth recipe, then the OAuth vs API-key distinction) and each loss surfaced as
a runtime failure in a user's session rather than a build error here.

Emitting the manifest at publish time puts the translation in the repository that
owns `capabilities.json`, so a mapping gap fails in CI where a tool author can see
it.

Policy fields (`trust`, `origin_gate_matrix`, `default_permission`, `visibility`)
ARE emitted, because the v3 parser requires them structurally — omitting
`default_permission` fails with `missing field default_permission` before any
semantic check runs. They are emitted at their most restrictive values, and
IronClaw overrides all four unconditionally after parsing. A published package
therefore cannot grant itself authority: whatever it writes here is replaced.
Treat the values below as syntax, not as policy.

Everything else this script emits is a *descriptive* fact: what the tool is and
which network targets and credentials it needs.

Usage:
    generate-extension-manifest.py <capabilities.json> <name> <crate_name> <version>
"""

from __future__ import annotations

import json
import sys


PUBLISHED_EFFECTS = {"external_write", "financial"}

TOML_ESCAPES = {
    "\\": "\\\\",
    '"': '\\"',
    "\b": "\\b",
    "\t": "\\t",
    "\n": "\\n",
    "\f": "\\f",
    "\r": "\\r",
}


def toml_string(value: str) -> str:
    """Quote a TOML basic string, escaping what the spec requires.

    A basic string may not carry a raw control character, so anything in that
    range without a named escape is emitted as \\uXXXX. Escaping only the five
    common ones leaves a description containing, say, a form feed to produce a
    manifest that fails to parse at install time rather than here.
    """
    out = []
    for char in value:
        escape = TOML_ESCAPES.get(char)
        if escape is not None:
            out.append(escape)
        elif char < " " or char == "\x7f":
            out.append(f"\\u{ord(char):04X}")
        else:
            out.append(char)
    return '"{}"'.format("".join(out))


def credential_injection(name: str, location: dict, handle: str) -> dict:
    """Map a published credential location onto the v3 injection contract.

    v3 models header / query-param / path-placeholder / JSON-pointer / basic
    injection. A `basic` location carries only the username: the host owns the
    `username:secret` join and the base64 encoding, so a package can never ship
    a pre-encoded credential or smuggle a second field past the colon.
    """
    if not isinstance(location, dict):
        raise SystemExit(f"{name}: credential {handle!r} location must be an object")
    kind = location.get("type", "")
    if kind == "bearer":
        return {
            "type": "header",
            "name": "authorization",
            "prefix": "Bearer ",
        }
    if kind == "header":
        # monday.com sends the raw token as the Authorization value with no
        # scheme prefix; inventing one would break every request it makes.
        header = location.get("name", "authorization")
        if not isinstance(header, str) or not header.strip():
            raise SystemExit(
                f"{name}: credential {handle!r} declares a header location "
                f"without a name"
            )
        return {
            "type": "header",
            "name": header.strip().lower(),
            "prefix": None,
        }
    if kind == "query_param":
        parameter = location.get("name")
        if not isinstance(parameter, str) or not parameter.strip():
            raise SystemExit(
                f"{name}: credential {handle!r} declares a query_param location "
                f"without a name"
            )
        return {"type": "query_param", "name": parameter.strip()}
    if kind == "basic":
        username = location.get("username")
        if not isinstance(username, str) or not username.strip():
            raise SystemExit(
                f"{name}: credential {handle!r} declares a basic location "
                f"without a username"
            )
        username = username.strip()
        if ":" in username:
            raise SystemExit(
                f"{name}: credential {handle!r} declares a basic username "
                f"containing ':', which RFC 7617 reserves as the delimiter"
            )
        return {"type": "basic", "username": username}
    raise SystemExit(
        f"{name}: credential {handle!r} declares location type {kind!r}, which the "
        f"host cannot inject. Supported: 'bearer', 'header', 'query_param', 'basic'."
    )


def http_capability(name: str, caps: dict) -> dict:
    """Return the HTTP capability without silently choosing between schemas.

    Most tools publish `http` at the document root. Newer component-model tools
    publish it under `capabilities.http`. Both are supported, but declaring both
    is ambiguous and must be resolved by the tool author rather than by a
    precedence rule here.
    """
    root_http = caps.get("http") if "http" in caps else None
    capabilities = caps.get("capabilities")
    if capabilities is not None and not isinstance(capabilities, dict):
        raise SystemExit(f"{name}: capabilities must be an object")
    nested_http = (
        capabilities.get("http")
        if isinstance(capabilities, dict) and "http" in capabilities
        else None
    )

    if root_http is not None and nested_http is not None:
        raise SystemExit(
            f"{name}: HTTP capability is declared in both 'http' and "
            f"'capabilities.http'; keep exactly one representation"
        )
    http = root_http if root_http is not None else nested_http
    if http is None:
        raise SystemExit(
            f"{name}: no HTTP capability found at 'http' or 'capabilities.http'"
        )
    if not isinstance(http, dict):
        raise SystemExit(f"{name}: HTTP capability must be an object")
    return http


def network_hosts(name: str, http: dict) -> list[str]:
    """Return each allowlisted host once, preserving declaration order."""
    allowlist = http.get("allowlist")
    if not isinstance(allowlist, list) or not allowlist:
        raise SystemExit(f"{name}: HTTP capability must declare a non-empty allowlist")

    hosts = []
    for index, entry in enumerate(allowlist):
        if not isinstance(entry, dict):
            raise SystemExit(f"{name}: HTTP allowlist entry {index} must be an object")
        host = entry.get("host")
        if not isinstance(host, str) or not host.strip():
            raise SystemExit(
                f"{name}: HTTP allowlist entry {index} must declare a non-empty host"
            )
        host = host.strip()
        if host not in hosts:
            hosts.append(host)
    return hosts


def declared_effects(name: str, caps: dict) -> list[str]:
    """Return security-relevant effects explicitly declared by the publisher."""
    effects = caps.get("effects")
    if not isinstance(effects, list):
        raise SystemExit(
            f"{name}: effects must be an explicit list (use [] for read-only tools)"
        )

    seen = set()
    for effect in effects:
        if not isinstance(effect, str) or effect not in PUBLISHED_EFFECTS:
            allowed = ", ".join(sorted(PUBLISHED_EFFECTS))
            raise SystemExit(
                f"{name}: unsupported effect {effect!r}; supported: {allowed}"
            )
        if effect in seen:
            raise SystemExit(f"{name}: duplicate effect {effect!r}")
        seen.add(effect)
    return effects


def oauth_scopes(name: str, caps: dict) -> list[str] | None:
    """Return OAuth scopes, distinguishing OAuth with no scopes from API keys."""
    auth = caps.get("auth") or {}
    if not isinstance(auth, dict):
        raise SystemExit(f"{name}: auth must be an object")
    oauth = auth.get("oauth")
    if oauth is None:
        return None
    if not isinstance(oauth, dict):
        raise SystemExit(f"{name}: auth.oauth must be an object")
    scopes = oauth.get("scopes", [])
    if not isinstance(scopes, list):
        raise SystemExit(f"{name}: auth.oauth.scopes must be a list")

    normalized = []
    for scope in scopes:
        if not isinstance(scope, str) or not scope.strip():
            raise SystemExit(f"{name}: OAuth scopes must be non-empty strings")
        scope = scope.strip()
        if scope in normalized:
            raise SystemExit(f"{name}: duplicate OAuth scope {scope!r}")
        normalized.append(scope)
    return normalized


def secret_names(name: str, caps: dict) -> list[str]:
    """Read the supported secrets shape without silently choosing precedence."""
    root_secrets = caps.get("secrets") if "secrets" in caps else None
    capabilities = caps.get("capabilities")
    nested_secrets = (
        capabilities.get("secrets")
        if isinstance(capabilities, dict) and "secrets" in capabilities
        else None
    )
    if root_secrets is not None and nested_secrets is not None:
        raise SystemExit(
            f"{name}: secrets are declared in both 'secrets' and "
            f"'capabilities.secrets'; keep exactly one representation"
        )
    secrets = root_secrets if root_secrets is not None else nested_secrets
    if secrets is None:
        secrets = {}
    if not isinstance(secrets, dict):
        raise SystemExit(f"{name}: secrets capability must be an object")
    allowed_names = secrets.get("allowed_names", [])
    if not isinstance(allowed_names, list):
        raise SystemExit(f"{name}: secrets.allowed_names must be a list")
    if any(not isinstance(secret, str) or not secret.strip() for secret in allowed_names):
        raise SystemExit(
            f"{name}: secrets.allowed_names must contain non-empty strings"
        )
    if len(set(allowed_names)) != len(allowed_names):
        raise SystemExit(f"{name}: secrets.allowed_names contains duplicates")
    return allowed_names


def setup_copy(name: str, auth: dict) -> list[str]:
    """Carry the vendor's own account-setup steps into the recipe.

    Without these the host can tell a user a secret is required but not where it
    comes from, and a model asked to help has no grounded source and invents the
    steps. `setup_url` must be https because it becomes a link the user is
    invited to follow.
    """
    lines = []
    instructions = (auth.get("instructions") or "").strip()
    if instructions:
        lines.append(f"instructions = {toml_string(instructions)}")
    setup_url = (auth.get("setup_url") or "").strip()
    if setup_url:
        if not setup_url.startswith("https://"):
            raise SystemExit(
                f"{name}: auth.setup_url {setup_url!r} is not https; the host only "
                f"renders https setup links"
            )
        lines.append(f"setup_url = {toml_string(setup_url)}")
    return lines


def auth_recipe(name: str, caps: dict, handles: list[str]) -> str:
    """Emit `[auth.<vendor>]`, which v3 requires for every referenced vendor.

    The method follows what the tool published rather than a fixed default: a
    tool carrying `auth.oauth` gets `oauth2_code`; one without gets `api_key`.
    Forcing `api_key` on an OAuth vendor makes the user paste an access token by
    hand that then expires with no refresh.
    """
    auth = caps.get("auth") or {}
    display_name = auth.get("display_name") or name
    oauth = auth.get("oauth")

    if oauth is not None:
        scopes = ", ".join(toml_string(s) for s in oauth_scopes(name, caps) or [])
        lines = [
            f"\n[auth.{name}]",
            'method = "oauth2_code"',
            f"display_name = {toml_string(display_name)}",
            f"authorization_endpoint = {toml_string(oauth.get('authorization_url', ''))}",
            f"token_endpoint = {toml_string(oauth.get('token_url', ''))}",
            f"scopes = [ {scopes} ]",
        ]
        # PKCE defaults to S256 in the recipe; only an explicit opt-out is declared.
        if oauth.get("use_pkce", True) is False:
            lines.append('pkce = "none"')
        client_id = (oauth.get("client_id_env") or "").lower()
        client_secret = (oauth.get("client_secret_env") or "").lower()
        if client_id:
            # Deployment-level client credentials are referenced by secret HANDLE,
            # never by value, so no secret material enters the manifest.
            pair = f"client_id_handle = {toml_string(client_id)}"
            if client_secret:
                pair += f", client_secret_handle = {toml_string(client_secret)}"
            lines.append(f"client_credentials = {{ {pair} }}")
        lines.extend(setup_copy(name, auth))
        # `token_response` is required by the recipe and absent from the
        # capabilities artifact. Unlike a validation probe (a URL only the vendor
        # can know) this shape is fixed by RFC 6749 section 5.1, and the pointers
        # say where to look rather than asserting the fields are present.
        lines.append(f"\n[auth.{name}.token_response]")
        lines.append('access_token = "/access_token"')
        lines.append('refresh_token = "/refresh_token"')
        lines.append('expires_in = "/expires_in"')
        return "\n".join(lines) + "\n"

    prompts = {
        s.get("name"): s.get("prompt")
        for s in (caps.get("setup") or {}).get("required_secrets") or []
    }
    fields = ", ".join(
        "{{ handle = {handle}, label = {label}, secret = true }}".format(
            handle=toml_string(h),
            label=toml_string(prompts.get(h) or h),
        )
        for h in handles
    )
    lines = [
        f"\n[auth.{name}]",
        'method = "api_key"',
        f"display_name = {toml_string(display_name)}",
        f"fields = [ {fields} ]",
    ]
    lines.extend(setup_copy(name, auth))
    return "\n".join(lines) + "\n"


def generate_manifest(caps: dict, name: str, crate_name: str, version: str) -> str:
    """Translate a capabilities document into a complete v3 manifest."""
    description = caps.get("description") or ""
    source_version = caps.get("version")
    if source_version != version:
        raise SystemExit(
            f"{name}: capabilities version {source_version!r} does not match "
            f"Cargo version {version!r}"
        )
    published_effects = declared_effects(name, caps)
    scopes = oauth_scopes(name, caps)
    http = http_capability(name, caps)
    hosts = network_hosts(name, http)
    credentials = http.get("credentials", {})
    if not isinstance(credentials, dict):
        raise SystemExit(f"{name}: HTTP credentials must be an object")
    handles = sorted(credentials)
    allowed_names = secret_names(name, caps)
    if sorted(allowed_names) != handles:
        raise SystemExit(
            f"{name}: credential handles {handles!r} must exactly match "
            f"secrets.allowed_names {sorted(allowed_names)!r}"
        )

    blocks = []
    for handle_name in handles:
        credential = credentials[handle_name]
        if not isinstance(credential, dict):
            raise SystemExit(f"{name}: credential {handle_name!r} must be an object")
        secret_name = credential.get("secret_name")
        if secret_name != handle_name:
            raise SystemExit(
                f"{name}: credential handle {handle_name!r} must match its "
                f"secret_name {secret_name!r}"
            )
        injection = credential_injection(name, credential.get("location") or {}, handle_name)
        credential_hosts = credential.get("host_patterns") or []
        if not isinstance(credential_hosts, list) or not credential_hosts:
            raise SystemExit(
                f"{name}: credential {handle_name!r} declares no host_patterns; the "
                f"injection audience cannot be bounded"
            )
        if len(credential_hosts) != 1:
            raise SystemExit(
                f"{name}: credential {handle_name!r} declares {len(credential_hosts)} "
                f"host_patterns, but a v3 credential has one audience; split the "
                f"credential or extend the v3 contract instead of dropping hosts"
            )
        credential_host = credential_hosts[0]
        if not isinstance(credential_host, str) or not credential_host.strip():
            raise SystemExit(
                f"{name}: credential {handle_name!r} declares an invalid host_pattern"
            )
        credential_host = credential_host.strip()
        if credential_host not in hosts:
            raise SystemExit(
                f"{name}: credential {handle_name!r} targets {credential_host!r}, "
                f"which is absent from the HTTP allowlist"
            )
        optional = credential.get("optional", False)
        if not isinstance(optional, bool):
            raise SystemExit(
                f"{name}: credential {handle_name!r} optional must be a boolean"
            )
        if injection["type"] == "header":
            prefix = ""
            if injection["prefix"] is not None:
                prefix = f", prefix = {toml_string(injection['prefix'])}"
            injection_toml = (
                f'{{ type = "header", name = {toml_string(injection["name"])}'
                f"{prefix} }}"
            )
        elif injection["type"] == "basic":
            injection_toml = (
                f'{{ type = "basic", username = {toml_string(injection["username"])} }}'
            )
        elif injection["type"] == "query_param":
            injection_toml = (
                f'{{ type = "query_param", name = {toml_string(injection["name"])} }}'
            )
        else:
            raise SystemExit(
                f"{name}: credential {handle_name!r} produced an unsupported "
                f"injection type {injection['type']!r}"
            )
        scope_line = ""
        if scopes is not None:
            scope_values = ", ".join(toml_string(scope) for scope in scopes)
            scope_line = f"scopes = [ {scope_values} ]\n"
        blocks.append(
            f"\n[[tools.credentials]]\n"
            f"handle = {toml_string(handle_name)}\n"
            f"vendor = {toml_string(name)}\n"
            f'audience = {{ scheme = "https", host = {toml_string(credential_host)} }}\n'
            f"injection = {injection_toml}\n"
            f"{scope_line}"
            f"required = {'false' if optional else 'true'}\n"
        )

    effects = ["network"]
    if handles:
        effects.append("use_secret")
    effects.extend(published_effects)
    effects_toml = "[{}]".format(", ".join(toml_string(effect) for effect in effects))
    targets = ", ".join(
        f'{{ scheme = "https", host_pattern = {toml_string(host)} }}'
        for host in hosts
    )

    manifest = (
        'schema_version = "reborn.extension_manifest.v3"\n'
        f"id = {toml_string(name)}\n"
        f"name = {toml_string(name)}\n"
        f"version = {toml_string(version)}\n"
        f"description = {toml_string(description)}\n"
        # Syntax, not policy: the parser requires these, and IronClaw replaces
        # them after parsing. Emitted at their most restrictive values so a
        # manifest is never the reason something is permitted.
        'trust = "third_party"\n'
        "\n[runtime]\n"
        'kind = "wasm"\n'
        f"module = {toml_string(f'wasm/{crate_name}.wasm')}\n"
        "\n[[tools]]\n"
        'origin_gate_matrix = { loop_run = "gated_unless_granted", '
        'product = "forbidden", automation = "forbidden" }\n'
        f"id = {toml_string(f'{name}.invoke')}\n"
        f"description = {toml_string(description)}\n"
        f"effects = {effects_toml}\n"
        f"network_targets = [ {targets} ]\n"
        'default_permission = "ask"\n'
        'visibility = "model"\n'
        f"input_schema_ref = {toml_string(f'schemas/{name}/invoke.input.v1.json')}\n"
        f"output_schema_ref = {toml_string(f'schemas/{name}/raw_output.v1.json')}\n"
    )
    manifest += "".join(blocks)
    if handles:
        manifest += auth_recipe(name, caps, handles)

    return manifest


def main() -> None:
    if len(sys.argv) != 5:
        raise SystemExit(f"usage: {sys.argv[0]} <capabilities.json> <name> <crate> <version>")
    caps_path, name, crate_name, version = sys.argv[1:5]

    with open(caps_path, encoding="utf-8") as handle:
        caps = json.load(handle)

    manifest = generate_manifest(caps, name, crate_name, version)
    sys.stdout.write(manifest)


if __name__ == "__main__":
    main()
