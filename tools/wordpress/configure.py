#!/usr/bin/env python3
"""
Configure the WordPress tool's capabilities file for YOUR site.

Sets the baked host allowlist + credential host_patterns and the WordPress
Basic-auth username, so you never have to hand-edit the JSON. Idempotent: run
it again any time to point the tool at a different site or change the username.

Usage:
  python3 configure.py                         # interactive prompts
  python3 configure.py --host store.near.org --user admin
  WP_HOST=store.near.org WP_USER=admin python3 configure.py
  python3 configure.py --host '*.near.com'     # wildcard: all subdomains of one apex
  python3 configure.py --file /path/to/wordpress-tool.capabilities.json
  python3 configure.py --host my.site --api-prefix /api/  # custom REST API prefix
"""

import sys
import os
import json
import argparse
import re

def normalise_host(h):
    h = h.replace("http://", "").replace("https://", "")
    h = h.split("/")[0]
    return h.lower()

def valid_host(h):
    core = h
    if h.startswith("*."):
        core = h[2:]
    if not core:
        return False
    if "." not in core:
        return False
    if not re.match(r"^[a-z0-9.-]+$", core):
        return False
    if core.startswith(".") or core.endswith("."):
        return False
    return True

def main():
    parser = argparse.ArgumentParser(description="Configure WordPress tool capabilities JSON.", add_help=False)
    parser.add_argument("--host", help="WordPress site host (e.g. store.near.org)")
    parser.add_argument("--user", help="WordPress login username for Basic auth")
    parser.add_argument("--file", help="Path to capabilities file")
    parser.add_argument("--api-prefix", help="Custom REST API path prefix (default: /wp-json/)")
    parser.add_argument("-h", "--help", action="help", help="Show this help message and exit")
    
    args, unknown = parser.parse_known_args()
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    default_file = os.path.join(script_dir, "wordpress-tool.capabilities.json")
    
    file_path = args.file if args.file else default_file
    host = args.host if args.host is not None else os.environ.get("WP_HOST")
    username = args.user if args.user is not None else os.environ.get("WP_USER")
    user_given = args.user is not None or "WP_USER" in os.environ
    api_prefix = args.api_prefix
    
    if api_prefix:
        if not api_prefix.startswith("/"):
            api_prefix = "/" + api_prefix
        if not api_prefix.endswith("/"):
            api_prefix += "/"
    
    if not os.path.isfile(file_path):
        print(f"error: capabilities file not found: {file_path}", file=sys.stderr)
        sys.exit(1)
        
    # ---- host ----
    while True:
        if not host:
            if not sys.stdin.isatty():
                print("error: no host given (use --host or WP_HOST) and not interactive.", file=sys.stderr)
                sys.exit(1)
            try:
                host = input("WordPress site host (e.g. store.near.org, or *.near.com): ").strip()
            except EOFError:
                sys.exit(1)
                
        if host:
            host = normalise_host(host)
            if valid_host(host):
                break
            print(f"  '{host}' is not a bare domain. Use e.g. 'store.near.org' (no scheme/path/port) or '*.near.com'.", file=sys.stderr)
        host = None
        if not sys.stdin.isatty():
            sys.exit(1)
            
    # ---- username ----
    if not user_given and not username and sys.stdin.isatty():
        try:
            username = input("WordPress login username for Basic auth (leave blank if WooCommerce-only): ").strip()
        except EOFError:
            pass
            
    if username is None:
        username = ""

    # ---- write ----
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        print(f"error: failed to parse JSON from {file_path}: {e}", file=sys.stderr)
        sys.exit(1)
        
    try:
        data["capabilities"]["http"]["allowlist"][0]["host"] = host
        data["capabilities"]["http"]["credentials"]["wp_app_password"]["host_patterns"] = [host]
        data["capabilities"]["http"]["credentials"]["woo_consumer_key"]["host_patterns"] = [host]
        data["capabilities"]["http"]["credentials"]["woo_consumer_secret"]["host_patterns"] = [host]
        if username:
            data["capabilities"]["http"]["credentials"]["wp_app_password"]["location"]["username"] = username
            
        if api_prefix:
            data["capabilities"]["http"]["allowlist"][0]["path_prefix"] = api_prefix
            data["capabilities"]["http"]["credentials"]["wp_app_password"]["path_patterns"] = [f"{api_prefix}wp/"]
            data["capabilities"]["http"]["credentials"]["woo_consumer_key"]["path_patterns"] = [f"{api_prefix}wc/"]
            data["capabilities"]["http"]["credentials"]["woo_consumer_secret"]["path_patterns"] = [f"{api_prefix}wc/"]
            
    except KeyError as e:
        print(f"error: missing expected key in JSON structure: {e}", file=sys.stderr)
        sys.exit(1)
        
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
        f.write("\n")
        
    # ---- summary ----
    try:
        cur_host = data["capabilities"]["http"]["allowlist"][0]["host"]
        cur_user = data["capabilities"]["http"]["credentials"]["wp_app_password"]["location"]["username"]
    except KeyError:
        cur_host = host
        cur_user = username
        
    print()
    print(f"Configured {os.path.relpath(file_path)}")
    print(f"  host     : {cur_host}")
    print(f"  wp_user  : {cur_user}")
    if cur_user == "YOUR_WP_USERNAME":
        print("             (still placeholder — WooCommerce-only is fine; set --user later for WordPress auth)")
    print()
    print("Next:")
    print("  1. Build+stage: scripts/build-tool.sh wordpress   (-> dist/wordpress/wordpress-tool.wasm)")
    print("  2. Install:     ironclaw tool install dist/wordpress/wordpress-tool.wasm \\")
    print("                    --capabilities dist/wordpress/wordpress-tool.capabilities.json --name wordpress-tool")
    print("  3. Secrets:     ironclaw tool setup wordpress-tool")
    print("                  (the setup/auth name MUST equal the install --name)")
    print(f"  4. Call the tool with site_url = {cur_host}")

if __name__ == "__main__":
    main()
