# Nearcatalog API Documentation

## Overview
The `Nearcatalog` API provides read-only HTTP GET endpoints for browsing and discovering projects and categories in the NEARCatalog ecosystem.

### Base URL
- `{{base_url}}` = https://api.nearcatalog.xyz

### Authentication
- None (Public Read-Only)

---

## Endpoint Directory

### 1. Get Project Details
- **Method:** `GET`
- **Path:** `/project`
- **Full URL Example:** `{{base_url}}/project?pid=ref-finance`
- **Purpose:** Returns details for a single project by its unique identifier.

#### Query Parameters
| Name | Required | Type | Example | Description |
|---|---|---|---|---|
| `pid` | Yes | String | `ref-finance` | Project identifier. |

---

### 2. List & Filter Projects
- **Method:** `GET`
- **Path:** `/projects`
- **Full URL Example:** `{{base_url}}/projects?status=active&phase=mainnet`
- **Purpose:** Returns a list of projects. Supports filtering by status, lifecycle phase, or both. Leaving parameters empty returns the full unfiltered catalog.

#### Query Parameters
| Name | Required | Type | Allowed Values / Examples | Description |
|---|---|---|---|---|
| `status` | No | String | `active`, `inactive` | Filters projects by operational status. |
| `phase` | No | String | `mainnet`, `testnet` | Filters projects by ecosystem phase. |

---

### 3. List Projects by Category
- **Method:** `GET`
- **Path:** `/projects-by-category`
- **Full URL Example:** `{{base_url}}/projects-by-category?cid=dex`
- **Purpose:** Returns projects belonging to a specific category or grouping (e.g., trending).

#### Query Parameters
| Name | Required | Type | Example | Description |
|---|---|---|---|---|
| `cid` | Yes | String | `dex`, `trending` | Category identifier or grouping filter. |

---

### 4. Get Related Projects
- **Method:** `GET`
- **Path:** `/related-projects`
- **Full URL Example:** `{{base_url}}/related-projects?pid=ref-finance`
- **Purpose:** Returns projects related to a given project identifier.

#### Query Parameters
| Name | Required | Type | Example | Description |
|---|---|---|---|---|
| `pid` | Yes | String | `ref-finance` | Base project identifier used to find matches. |

---

### 5. Search Projects
- **Method:** `GET`
- **Path:** `/search`
- **Full URL Example:** `{{base_url}}/search?kw=privacy`
- **Purpose:** Searches for projects using a text keyword match against project details.

#### Query Parameters
| Name | Required | Type | Example | Description |
|---|---|---|---|---|
| `kw` | Yes | String | `privacy` | Keyword string to query. |

---

### 6. List All Categories
- **Method:** `GET`
- **Path:** `/categories`
- **Full URL Example:** `{{base_url}}/categories`
- **Purpose:** Returns a full index of available project categories.
- **Query Parameters:** None.

---

## Agent Reference Matrix

| Path | Method | Essential Query Params | Primary Function |
|---|---|---|---|
| `/project` | `GET` | `pid` | Fetch specific project profile |
| `/projects` | `GET` | `status`, `phase` (Optional) | Query full or filtered catalog |
| `/projects-by-category` | `GET` | `cid` | Fetch category or trending listings |
| `/related-projects` | `GET` | `pid` | Discover recommendation relations |
| `/search` | `GET` | `kw` | Free-text search engine execution |
| `/categories` | `GET` | None | Fetch all system taxonomy terms |