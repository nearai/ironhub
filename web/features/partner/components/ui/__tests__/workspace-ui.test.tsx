import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { createEvent, fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { IconSparkles, IconTool } from "@tabler/icons-react"

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    className,
  }: {
    children: React.ReactNode
    href: string
    className?: string
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}))

import {
  ArtifactCard,
  AttributeBadge,
  DataTable,
  type DataTableColumn,
  EmptyState,
  FilterMenu,
  FormSection,
  RelativeTime,
  StatCard,
  StatRow,
  StatusBadge,
  ViewToggle,
  WorkspacePageHeader,
} from "../index"

describe("StatusBadge", () => {
  it("renders 'Draft' and is not uppercase text content", () => {
    const { container } = render(<StatusBadge status="draft" />)
    expect(screen.getByText("Draft")).toBeInTheDocument()
    expect(screen.queryByText("DRAFT")).not.toBeInTheDocument()
    expect(container.textContent).toBe("Draft")
  })

  it("renders 'Published' and is not uppercase text content", () => {
    const { container } = render(<StatusBadge status="published" />)
    expect(screen.getByText("Published")).toBeInTheDocument()
    expect(screen.queryByText("PUBLISHED")).not.toBeInTheDocument()
    expect(container.textContent).toBe("Published")
  })
})

describe("AttributeBadge", () => {
  it("renders its child and its icon is decorative", () => {
    const { container } = render(
      <AttributeBadge icon={IconSparkles}>Featured</AttributeBadge>
    )
    expect(screen.getByText("Featured")).toBeInTheDocument()
    const icon = container.querySelector("svg")
    expect(icon).toBeInTheDocument()
    expect(icon).toHaveAttribute("aria-hidden", "true")
  })

  it("renders text and exposes title attribute", () => {
    render(
      <AttributeBadge muted title="No category">
        Uncategorised
      </AttributeBadge>
    )
    const badge = screen
      .getByText("Uncategorised")
      .closest("[data-slot='badge']")
    expect(screen.getByText("Uncategorised")).toBeInTheDocument()
    expect(badge).toHaveAttribute("title", "No category")
  })

  it("defaults title to children string when title prop is omitted for truncated hover readability", () => {
    render(
      <AttributeBadge>
        Very Long Category Name That Exceeds Normal Width
      </AttributeBadge>
    )
    const badge = screen
      .getByText("Very Long Category Name That Exceeds Normal Width")
      .closest("[data-slot='badge']")
    expect(badge).toHaveAttribute(
      "title",
      "Very Long Category Name That Exceeds Normal Width"
    )
  })
})

describe("ArtifactCard", () => {
  it("with no description renders placeholder, title once, type word once in meta line, and no absolute timestamp with ':'", () => {
    const { container } = render(
      <ArtifactCard
        type="skill"
        title="Web Scraper"
        version="1.2.0"
        status="draft"
        description={null}
        visibility="private"
        category={null}
        fileCount={0}
        updatedAt="2026-08-17T12:00:00.000Z"
        href="/mvp/manage/skill-1"
      />
    )

    // Renders description placeholder
    expect(screen.getByText("No description yet")).toBeInTheDocument()

    // Renders the title once
    const titles = screen.getAllByText("Web Scraper")
    expect(titles).toHaveLength(1)

    // Renders the type word ("Skill") exactly once in the entire card (in the meta line)
    const cardText = container.textContent || ""
    const skillMatches = cardText.match(/skill/gi) || []
    expect(skillMatches).toHaveLength(1)
    expect(screen.getByText(/Skill · v1\.2\.0/)).toBeInTheDocument()

    // Renders no timestamp containing ":" (i.e. no absolute clock time)
    expect(cardText).not.toContain(":")
    expect(screen.getByText("Draft")).toBeInTheDocument()
    expect(screen.getByText("Private")).toBeInTheDocument()
    expect(screen.getByText("Uncategorised")).toBeInTheDocument()
    expect(screen.getByText("No files")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /manage/i })).toBeInTheDocument()
  })

  it("handles plural/singular file counts and custom action", () => {
    render(
      <ArtifactCard
        type="tool"
        title="API Gateway"
        version="2.0.0"
        status="published"
        description="Production API gateway"
        visibility="public"
        category="Networking"
        fileCount={1}
        updatedAt="2026-08-17T12:00:00.000Z"
        action={<button type="button">Custom Action</button>}
      />
    )

    expect(screen.getByText("1 file")).toBeInTheDocument()
    expect(screen.getByText("Production API gateway")).toBeInTheDocument()
    expect(screen.getByText("Networking")).toBeInTheDocument()
    expect(screen.getByText("Public")).toBeInTheDocument()
    expect(screen.getByText("Tool · v2.0.0")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Custom Action" })
    ).toBeInTheDocument()
  })

  it("formats file count > 1 correctly", () => {
    render(
      <ArtifactCard
        type="tool"
        title="CLI Tools"
        version="0.1.0"
        status="draft"
        description="Assorted CLI scripts"
        visibility="private"
        category="DevTools"
        fileCount={5}
        updatedAt="2026-08-17T12:00:00.000Z"
      />
    )
    expect(screen.getByText("5 files")).toBeInTheDocument()
  })

  it("renders without link or button when neither href nor action is provided, and shows facts", () => {
    render(
      <ArtifactCard
        type="tool"
        title="Simple Tool"
        version="1.0.0"
        status="published"
        description="A plain tool"
        visibility="public"
        category="Utilities"
        fileCount={2}
        updatedAt="2026-08-17T12:00:00.000Z"
      />
    )

    expect(screen.queryByRole("link")).toBeNull()
    expect(screen.queryByRole("button")).toBeNull()
    expect(screen.getByText("Simple Tool")).toBeInTheDocument()
    expect(screen.getByText("Published")).toBeInTheDocument()
    expect(screen.getByText("Public")).toBeInTheDocument()
    expect(screen.getByText("Utilities")).toBeInTheDocument()
    expect(screen.getByText("2 files")).toBeInTheDocument()
  })
})

describe("DataTable", () => {
  interface TestRow {
    id: string
    name: string
    status: string
  }

  const testColumns: DataTableColumn<TestRow>[] = [
    { key: "name", header: "Name", cell: (row) => row.name },
    {
      key: "status",
      header: "Status",
      cell: (row) => row.status,
      align: "right",
    },
  ]

  const testRows: TestRow[] = [
    { id: "1", name: "Alpha", status: "Active" },
    { id: "2", name: "Beta", status: "Pending" },
  ]

  it("renders header and one row per item with accessible roles and cell contents", () => {
    render(
      <DataTable
        columns={testColumns}
        rows={testRows}
        rowKey={(row) => row.id}
      />
    )

    // 1 header row + 2 data rows = 3 rows total
    const rows = screen.getAllByRole("row")
    expect(rows).toHaveLength(3)

    const columnHeaders = screen.getAllByRole("columnheader")
    expect(columnHeaders).toHaveLength(testColumns.length)
    expect(
      screen.getByRole("columnheader", { name: "Name" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("columnheader", { name: "Status" })
    ).toBeInTheDocument()

    expect(screen.getByText("Alpha")).toBeInTheDocument()
    expect(screen.getByText("Active")).toBeInTheDocument()
    expect(screen.getByText("Beta")).toBeInTheDocument()
    expect(screen.getByText("Pending")).toBeInTheDocument()
  })

  it("omits thead when rows is empty and empty node is provided, spanning all columns", () => {
    const { container } = render(
      <DataTable
        columns={testColumns}
        rows={[]}
        rowKey={(row) => row.id}
        empty={<div data-testid="empty-state">No records found</div>}
      />
    )

    expect(screen.queryAllByRole("columnheader")).toHaveLength(0)
    expect(screen.getByTestId("empty-state")).toBeInTheDocument()
    expect(screen.getByText("No records found")).toBeInTheDocument()
    const emptyCell = container.querySelector("tbody td")
    expect(emptyCell).toHaveAttribute("colspan", String(testColumns.length))
  })

  it("renders column headers when rows is empty and no empty prop is passed", () => {
    const { container } = render(
      <DataTable columns={testColumns} rows={[]} rowKey={(row) => row.id} />
    )

    expect(screen.getAllByRole("columnheader")).toHaveLength(testColumns.length)
    const rows = container.querySelectorAll("tbody tr")
    expect(rows).toHaveLength(0)
  })

  it("applies min-width inline style only when rows are present", () => {
    const { container: emptyContainer } = render(
      <DataTable
        columns={testColumns}
        rows={[]}
        rowKey={(row) => row.id}
        minWidth="50rem"
      />
    )
    const emptyTable = emptyContainer.querySelector("table")
    expect(emptyTable?.style.minWidth).toBe("")

    const { container: populatedContainer } = render(
      <DataTable
        columns={testColumns}
        rows={testRows}
        rowKey={(row) => row.id}
        minWidth="50rem"
      />
    )
    const populatedTable = populatedContainer.querySelector("table")
    expect(populatedTable?.style.minWidth).toBe("50rem")
  })

  it("gates sticky header styling on maxHeight presence", () => {
    const { container: withoutMaxHeight } = render(
      <DataTable
        columns={testColumns}
        rows={testRows}
        rowKey={(row) => row.id}
        stickyHeader={true}
      />
    )
    const thWithoutSticky = withoutMaxHeight.querySelector("th")
    expect(thWithoutSticky).not.toHaveClass("sticky")

    const { container: withMaxHeight } = render(
      <DataTable
        columns={testColumns}
        rows={testRows}
        rowKey={(row) => row.id}
        stickyHeader={true}
        maxHeight="32rem"
      />
    )
    const thWithSticky = withMaxHeight.querySelector("th")
    expect(thWithSticky).toHaveClass("sticky")
    const scrollContainer = withMaxHeight.querySelector(".overflow-x-auto")
    expect(scrollContainer).toHaveClass("overflow-y-auto")
    expect(scrollContainer).toHaveStyle({ maxHeight: "32rem" })
  })

  it("applies default truncation max-width to unwrapped columns and omits it for wrapped columns", () => {
    const columnsWithWrap: DataTableColumn<TestRow>[] = [
      { key: "name", header: "Name", cell: (row) => row.name },
      {
        key: "status",
        header: "Status",
        cell: (row) => row.status,
        wrap: true,
      },
    ]

    const { container } = render(
      <DataTable
        columns={columnsWithWrap}
        rows={testRows}
        rowKey={(row) => row.id}
      />
    )

    const firstRowCells = container.querySelectorAll("tbody tr:first-child td")
    const unwrappedDiv = firstRowCells[0]?.querySelector("div")
    const wrappedDiv = firstRowCells[1]?.querySelector("div")

    expect(unwrappedDiv).toHaveClass("truncate")
    expect(unwrappedDiv?.style.maxWidth).toBe("16rem")

    expect(wrappedDiv).not.toHaveClass("truncate")
    expect(wrappedDiv?.style.maxWidth).toBe("")
  })

  it("supports interactive action buttons inside rows without row-level interference", () => {
    const handleManage = vi.fn()
    const columnsWithActions: DataTableColumn<TestRow>[] = [
      { key: "name", header: "Name", cell: (row) => row.name },
      {
        key: "actions",
        header: "Actions",
        srOnlyHeader: true,
        align: "right",
        cell: (row) => (
          <button type="button" onClick={() => handleManage(row.id)}>
            Manage {row.name}
          </button>
        ),
      },
    ]

    const { container } = render(
      <DataTable
        columns={columnsWithActions}
        rows={testRows}
        rowKey={(row) => row.id}
      />
    )

    const manageBtn = screen.getByRole("button", { name: "Manage Alpha" })
    fireEvent.click(manageBtn)
    expect(handleManage).toHaveBeenCalledTimes(1)
    expect(handleManage).toHaveBeenCalledWith("1")

    // Operable and reachable from keyboard
    manageBtn.focus()
    expect(document.activeElement).toBe(manageBtn)

    const spaceEvent = createEvent.keyDown(manageBtn, { key: " " })
    fireEvent(manageBtn, spaceEvent)
    expect(spaceEvent.defaultPrevented).toBe(false)

    fireEvent.click(manageBtn)
    expect(handleManage).toHaveBeenCalledTimes(2)

    // The <tr> itself is inert
    const firstRow = container.querySelector("tbody tr")
    expect(firstRow).toBeInTheDocument()
    expect(firstRow).not.toHaveAttribute("tabindex")
  })
})

describe("RelativeTime", () => {
  it("renders a <time> with a dateTime attribute and a title", () => {
    const isoString = "2026-08-17T12:00:00.000Z"
    render(<RelativeTime value={isoString} prefix="Updated" />)

    const timeElement = screen.getByText(/Updated/)
    expect(timeElement.tagName.toLowerCase()).toBe("time")
    expect(timeElement).toHaveAttribute("dateTime", isoString)
    expect(timeElement).toHaveAttribute("title")
    expect(timeElement.getAttribute("title")).toBe(
      new Date(isoString).toLocaleString()
    )
  })

  it("renders an em dash for invalid dates without throwing", () => {
    render(<RelativeTime value="not-a-valid-date" />)
    expect(screen.getByText("—")).toBeInTheDocument()
  })

  it("renders ISO date fallback without title on server render (renderToStaticMarkup)", () => {
    const isoString = "2026-08-17T12:00:00.000Z"
    const staticMarkup = renderToStaticMarkup(
      <RelativeTime value={isoString} prefix="Updated" />
    )

    expect(staticMarkup).toContain("2026-08-17")
    expect(staticMarkup).toContain("Updated")
    expect(staticMarkup).not.toContain("title=")
    expect(staticMarkup).toContain('dateTime="2026-08-17T12:00:00.000Z"')
    expect(staticMarkup).not.toMatch(/ago|just now/i)

    const { unmount } = render(
      <RelativeTime value={isoString} prefix="Updated" />
    )
    const clientElement = screen.getByText(/Updated/)
    expect(clientElement.textContent).not.toBe("Updated 2026-08-17")
    expect(clientElement).toHaveAttribute("title")
    unmount()
  })
})

describe("EmptyState", () => {
  it("renders title, description and action", () => {
    render(
      <EmptyState
        icon={IconSparkles}
        title="No items found"
        description="Try adjusting your search query."
        action={<button type="button">Create item</button>}
        secondaryAction={<button type="button">Learn more</button>}
      />
    )

    expect(screen.getByText("No items found")).toBeInTheDocument()
    expect(
      screen.getByText("Try adjusting your search query.")
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Create item" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Learn more" })
    ).toBeInTheDocument()
  })
})

describe("WorkspacePageHeader", () => {
  it("renders title, description, eyebrow, back link, action, and children", () => {
    render(
      <WorkspacePageHeader
        title="Workspace Overview"
        eyebrow="Internal Tooling"
        description="Manage your artifacts and loadouts."
        backHref="/mvp"
        backLabel="Return"
        action={<button type="button">New Submission</button>}
      >
        <div data-testid="toolbar">Filter Toolbar</div>
      </WorkspacePageHeader>
    )

    expect(screen.getByText("Workspace Overview")).toBeInTheDocument()
    expect(screen.getByText("Internal Tooling")).toBeInTheDocument()
    expect(
      screen.getByText("Manage your artifacts and loadouts.")
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /return/i })).toHaveAttribute(
      "href",
      "/mvp"
    )
    expect(
      screen.getByRole("button", { name: "New Submission" })
    ).toBeInTheDocument()
    expect(screen.getByTestId("toolbar")).toBeInTheDocument()
  })
})

describe("StatCard & StatRow", () => {
  it("renders label and value with tone styling", () => {
    render(
      <StatRow>
        <StatCard label="Total Skills" value={42} tone="primary" />
        <StatCard label="Drafts" value={3} tone="draft" hint="+1 today" />
        <StatCard label="Published" value={39} tone="published" />
      </StatRow>
    )

    expect(screen.getByText("Total Skills")).toBeInTheDocument()
    expect(screen.getByText("42")).toBeInTheDocument()
    expect(screen.getByText("Drafts")).toBeInTheDocument()
    expect(screen.getByText("3")).toBeInTheDocument()
    expect(screen.getByText("+1 today")).toBeInTheDocument()
  })

  it("handles selectable state with onSelect", () => {
    const handleSelect = vi.fn()
    render(
      <StatCard
        label="Selectable Metric"
        value={100}
        selected={true}
        onSelect={handleSelect}
      />
    )

    const button = screen.getByRole("button")
    expect(button).toHaveAttribute("aria-pressed", "true")
    fireEvent.click(button)
    expect(handleSelect).toHaveBeenCalledTimes(1)
  })

  it("renders non-interactive card without button when onSelect is omitted", () => {
    render(<StatCard label="Total Skills" value={42} />)
    expect(screen.queryByRole("button")).toBeNull()
    expect(screen.getByText("Total Skills")).toBeInTheDocument()
    expect(screen.getByText("42")).toBeInTheDocument()
  })

  it("exposes aria-pressed='false' when onSelect is provided without selected", () => {
    const handleSelect = vi.fn()
    render(
      <StatCard label="Selectable Metric" value={100} onSelect={handleSelect} />
    )
    const button = screen.getByRole("button")
    expect(button).toHaveAttribute("aria-pressed", "false")
  })

  it("renders all children when columns is set to 2 or 3", () => {
    const { rerender } = render(
      <StatRow columns={2}>
        <StatCard label="Metric A" value={1} />
        <StatCard label="Metric B" value={2} />
      </StatRow>
    )

    expect(screen.getByText("Metric A")).toBeInTheDocument()
    expect(screen.getByText("Metric B")).toBeInTheDocument()

    rerender(
      <StatRow columns={3}>
        <StatCard label="Metric 1" value={10} />
        <StatCard label="Metric 2" value={20} />
        <StatCard label="Metric 3" value={30} />
      </StatRow>
    )

    expect(screen.getByText("Metric 1")).toBeInTheDocument()
    expect(screen.getByText("Metric 2")).toBeInTheDocument()
    expect(screen.getByText("Metric 3")).toBeInTheDocument()
  })
})

describe("ViewToggle", () => {
  it("renders options and triggers onChange when clicked", () => {
    const handleChange = vi.fn()
    const options = [
      { value: "grid", label: "Grid", icon: IconSparkles },
      { value: "table", label: "Table", icon: IconTool },
    ]

    render(
      <ViewToggle
        value="grid"
        onChange={handleChange}
        options={options}
        label="Layout View"
      />
    )

    const group = screen.getByRole("group", { name: "Layout View" })
    expect(group).toBeInTheDocument()

    const gridBtn = screen.getByRole("button", { name: /grid/i })
    expect(gridBtn).toHaveAttribute("aria-pressed", "true")

    const tableBtn = screen.getByRole("button", { name: /table/i })
    expect(tableBtn).toHaveAttribute("aria-pressed", "false")

    fireEvent.click(tableBtn)
    expect(handleChange).toHaveBeenCalledWith("table")
  })
})

describe("FormSection", () => {
  it("renders step number, title, description, action and children", () => {
    render(
      <FormSection
        step={1}
        title="General Information"
        description="Enter basic metadata about your submission."
        action={<button type="button">Reset</button>}
      >
        <input type="text" placeholder="Name" />
      </FormSection>
    )

    expect(screen.getByText("1")).toBeInTheDocument()
    expect(screen.getByText("General Information")).toBeInTheDocument()
    expect(
      screen.getByText("Enter basic metadata about your submission.")
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Reset" })).toBeInTheDocument()
    expect(screen.getByPlaceholderText("Name")).toBeInTheDocument()
  })
})

describe("FilterMenu", () => {
  it("keeps its controls out of the document until it is opened", () => {
    render(
      <FilterMenu activeCount={0}>
        <label htmlFor="t">
          Type
          <select id="t" />
        </label>
      </FilterMenu>
    )

    expect(screen.queryByLabelText("Type")).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /filters/i }))
    expect(screen.getByLabelText("Type")).toBeInTheDocument()
  })

  it("shows how many filters are set, and offers to clear them only then", () => {
    const handleClear = vi.fn()
    const { rerender } = render(
      <FilterMenu activeCount={0} onClear={handleClear}>
        <span>controls</span>
      </FilterMenu>
    )

    const trigger = screen.getByRole("button", { name: /filters/i })
    // No badge at rest: the count is there to say a filter is on, so zero must
    // not draw the eye.
    expect(trigger).toHaveTextContent(/^Filters$/)

    fireEvent.click(trigger)
    expect(
      screen.queryByRole("button", { name: /clear filters/i })
    ).not.toBeInTheDocument()

    rerender(
      <FilterMenu activeCount={2} onClear={handleClear}>
        <span>controls</span>
      </FilterMenu>
    )
    expect(
      screen.getByRole("button", { name: /^filters/i })
    ).toHaveTextContent("2")

    fireEvent.click(screen.getByRole("button", { name: /clear filters/i }))
    expect(handleClear).toHaveBeenCalledTimes(1)
    // Clearing closes the panel -- there is nothing left in it to act on.
    expect(
      screen.queryByRole("button", { name: /clear filters/i })
    ).not.toBeInTheDocument()
  })

  it("closes on Escape", () => {
    render(
      <FilterMenu activeCount={0}>
        <span>controls</span>
      </FilterMenu>
    )

    fireEvent.click(screen.getByRole("button", { name: /filters/i }))
    expect(screen.getByText("controls")).toBeInTheDocument()

    fireEvent.keyDown(document, { key: "Escape" })
    expect(screen.queryByText("controls")).not.toBeInTheDocument()
  })
})
