import AppKit

struct Section {
  let title: String
  let body: String?
  let bullets: [String]
}

struct TextStyles {
  let title: [NSAttributedString.Key: Any]
  let subtitle: [NSAttributedString.Key: Any]
  let section: [NSAttributedString.Key: Any]
  let body: [NSAttributedString.Key: Any]
  let bodyTight: [NSAttributedString.Key: Any]
  let bullet: [NSAttributedString.Key: Any]
  let bulletTight: [NSAttributedString.Key: Any]
  let footer: [NSAttributedString.Key: Any]
}

let pageWidth: CGFloat = 792
let pageHeight: CGFloat = 612
let margin: CGFloat = 36
let columnGap: CGFloat = 24
let leftColumnWidth: CGFloat = 324
let rightColumnWidth: CGFloat = pageWidth - (margin * 2) - columnGap - leftColumnWidth

let backgroundColor = NSColor(calibratedRed: 0.97, green: 0.97, blue: 0.95, alpha: 1)
let inkColor = NSColor(calibratedRed: 0.11, green: 0.17, blue: 0.15, alpha: 1)
let accentColor = NSColor(calibratedRed: 0.05, green: 0.37, blue: 0.24, alpha: 1)
let mutedColor = NSColor(calibratedRed: 0.33, green: 0.39, blue: 0.36, alpha: 1)
let ruleColor = NSColor(calibratedRed: 0.78, green: 0.84, blue: 0.80, alpha: 1)

func makeParagraphStyle(
  font: NSFont,
  color: NSColor,
  lineHeightMultiple: CGFloat,
  paragraphSpacing: CGFloat = 0,
  headIndent: CGFloat = 0,
  firstLineHeadIndent: CGFloat = 0
) -> [NSAttributedString.Key: Any] {
  let style = NSMutableParagraphStyle()
  style.lineBreakMode = .byWordWrapping
  style.minimumLineHeight = ceil(font.pointSize * lineHeightMultiple)
  style.maximumLineHeight = ceil(font.pointSize * lineHeightMultiple)
  style.paragraphSpacing = paragraphSpacing
  style.headIndent = headIndent
  style.firstLineHeadIndent = firstLineHeadIndent

  return [
    .font: font,
    .foregroundColor: color,
    .paragraphStyle: style,
  ]
}

func measuredHeight(text: String, width: CGFloat, attributes: [NSAttributedString.Key: Any]) -> CGFloat {
  let attr = NSAttributedString(string: text, attributes: attributes)
  let bounds = attr.boundingRect(
    with: NSSize(width: width, height: .greatestFiniteMagnitude),
    options: [.usesLineFragmentOrigin, .usesFontLeading]
  )
  return ceil(bounds.height)
}

@discardableResult
func drawText(
  _ text: String,
  x: CGFloat,
  y: CGFloat,
  width: CGFloat,
  attributes: [NSAttributedString.Key: Any]
) -> CGFloat {
  let attr = NSAttributedString(string: text, attributes: attributes)
  let height = measuredHeight(text: text, width: width, attributes: attributes)
  let rect = NSRect(x: x, y: y, width: width, height: height)
  attr.draw(
    with: rect,
    options: [.usesLineFragmentOrigin, .usesFontLeading]
  )
  return height
}

func drawRule(x: CGFloat, y: CGFloat, width: CGFloat, color: NSColor) {
  color.setFill()
  NSBezierPath(rect: NSRect(x: x, y: y, width: width, height: 1)).fill()
}

func drawSection(
  section: Section,
  x: CGFloat,
  startY: CGFloat,
  width: CGFloat,
  styles: TextStyles
) -> CGFloat {
  var y = startY

  let titleHeight = drawText(section.title, x: x, y: y, width: width, attributes: styles.section)
  y += titleHeight + 8
  drawRule(x: x, y: y, width: width, color: ruleColor)
  y += 10

  if let body = section.body {
    let bodyHeight = drawText(body, x: x, y: y, width: width, attributes: styles.body)
    y += bodyHeight + 10
  }

  for bullet in section.bullets {
    let bulletHeight = drawText("- \(bullet)", x: x, y: y, width: width, attributes: styles.bullet)
    y += bulletHeight + 5
  }

  return y
}

func drawCompactSection(
  section: Section,
  x: CGFloat,
  startY: CGFloat,
  width: CGFloat,
  styles: TextStyles
) -> CGFloat {
  var y = startY

  let titleHeight = drawText(section.title, x: x, y: y, width: width, attributes: styles.section)
  y += titleHeight + 8
  drawRule(x: x, y: y, width: width, color: ruleColor)
  y += 10

  if let body = section.body {
    let bodyHeight = drawText(body, x: x, y: y, width: width, attributes: styles.bodyTight)
    y += bodyHeight + 10
  }

  for bullet in section.bullets {
    let bulletHeight = drawText("- \(bullet)", x: x, y: y, width: width, attributes: styles.bulletTight)
    y += bulletHeight + 4
  }

  return y
}

let titleFont = NSFont(name: "Menlo-Bold", size: 22) ?? NSFont.monospacedSystemFont(ofSize: 22, weight: .bold)
let subtitleFont = NSFont.systemFont(ofSize: 10, weight: .semibold)
let sectionFont = NSFont.systemFont(ofSize: 10.5, weight: .bold)
let bodyFont = NSFont.systemFont(ofSize: 9.4, weight: .regular)
let bodyTightFont = NSFont.systemFont(ofSize: 8.9, weight: .regular)
let bulletFont = NSFont.systemFont(ofSize: 8.8, weight: .regular)
let bulletTightFont = NSFont.systemFont(ofSize: 8.45, weight: .regular)
let footerFont = NSFont.systemFont(ofSize: 6.9, weight: .regular)

let styles = TextStyles(
  title: makeParagraphStyle(font: titleFont, color: accentColor, lineHeightMultiple: 1.0),
  subtitle: makeParagraphStyle(font: subtitleFont, color: mutedColor, lineHeightMultiple: 1.2),
  section: makeParagraphStyle(font: sectionFont, color: accentColor, lineHeightMultiple: 1.0),
  body: makeParagraphStyle(font: bodyFont, color: inkColor, lineHeightMultiple: 1.3),
  bodyTight: makeParagraphStyle(font: bodyTightFont, color: inkColor, lineHeightMultiple: 1.26),
  bullet: makeParagraphStyle(
    font: bulletFont,
    color: inkColor,
    lineHeightMultiple: 1.22,
    headIndent: 12,
    firstLineHeadIndent: 0
  ),
  bulletTight: makeParagraphStyle(
    font: bulletTightFont,
    color: inkColor,
    lineHeightMultiple: 1.2,
    headIndent: 12,
    firstLineHeadIndent: 0
  ),
  footer: makeParagraphStyle(font: footerFont, color: mutedColor, lineHeightMultiple: 1.2)
)

let whatItIs = Section(
  title: "WHAT IT IS",
  body: "Terminal-OS is an OS-like retro UI built with React, Vite, TypeScript, and SCSS modules. It combines a landing flow, a panel-based desktop shell, and four subsystems: ME, YOU, THIRD, and CONNECT.",
  bullets: []
)

let whoItsFor = Section(
  title: "WHO IT IS FOR",
  body: "Primary persona inferred from seeded ME desktop copy and content: portfolio visitors browsing work, media, and contact details through a desktop metaphor.",
  bullets: []
)

let whatItDoes = Section(
  title: "WHAT IT DOES",
  body: nil,
  bullets: [
    "Boots from ENTER.EXE into a 2x2 desktop with a persistent bottom status bar.",
    "Runs ME.EXE as a live mini ME.OS that expands to fullscreen without resetting state.",
    "Uses FileMan over a versioned virtual file system seeded with Home, Projects, Media, Archive, About, Contact, and README items.",
    "Opens text, image, video, project, and contact files in dedicated viewer windows.",
    "Provides YOU.EXE as a preview and fullscreen message board backed by an HTTP API when configured.",
    "Provides THIRD.EXE as a 3D scene playground with primitives, edit/play modes, physics, undo/redo, and autosave.",
    "Keeps dock, menu, window, and context behavior scope-aware across panel and fullscreen modes."
  ]
)

let howItWorks = Section(
  title: "HOW IT WORKS",
  body: "Compact architecture overview from repo code:",
  bullets: [
    "main.tsx mounts ThemeProvider and App.",
    "App.tsx owns the landing sequence, preload heuristics, and lazy loading of DesktopRuntime.",
    "DesktopRuntime composes MeOsProvider, MeOsVfsProvider, YouProvider, ThirdProvider, and ConnectProvider, then renders Desktop, StatusBar, and fullscreen layers.",
    "ME data flow: Desktop and FileMan actions -> MeOsProvider window or scope state -> VFS service -> versioned localStorage snapshot -> subscribed VFS consumers rerender.",
    "YOU data flow: YouProvider -> YouApiClient -> GET or POST to VITE_YOU_API_BASE_URL or /api/you.",
    "THIRD data flow: ThirdProvider -> state and history helpers -> local persistence with autosave. CONNECT deeper backend or service layer: Not found in repo."
  ]
)

let howToRun = Section(
  title: "HOW TO RUN",
  body: nil,
  bullets: [
    "npm install",
    "npm run dev",
    "Open http://localhost:5173",
    "Optional for live YOU backend: set VITE_YOU_API_BASE_URL in .env.local"
  ]
)

final class SummaryView: NSView {
  override var isFlipped: Bool { true }

  override func draw(_ dirtyRect: NSRect) {
    backgroundColor.setFill()
    bounds.fill()

    let headerBand = NSRect(x: margin, y: 28, width: pageWidth - (margin * 2), height: 48)
    let accentBar = NSRect(x: margin, y: 28, width: 10, height: 48)
    accentColor.setFill()
    NSBezierPath(rect: accentBar).fill()

    _ = drawText("TERMINAL-OS", x: headerBand.minX + 20, y: 30, width: 260, attributes: styles.title)
    _ = drawText(
      "One-page app summary based only on repo evidence | 2026-03-05",
      x: headerBand.minX + 20,
      y: 57,
      width: 410,
      attributes: styles.subtitle
    )

    let chipRect = NSRect(x: pageWidth - margin - 186, y: 34, width: 186, height: 26)
    let chipPath = NSBezierPath(roundedRect: chipRect, xRadius: 8, yRadius: 8)
    NSColor(calibratedRed: 0.90, green: 0.94, blue: 0.91, alpha: 1).setFill()
    chipPath.fill()
    _ = drawText(
      "React | Vite | TypeScript | SCSS",
      x: chipRect.minX + 10,
      y: chipRect.minY + 5,
      width: chipRect.width - 20,
      attributes: styles.subtitle
    )

    var leftY: CGFloat = 98
    let leftX = margin
    leftY = drawSection(section: whatItIs, x: leftX, startY: leftY, width: leftColumnWidth, styles: styles)
    leftY += 6
    leftY = drawSection(section: whoItsFor, x: leftX, startY: leftY, width: leftColumnWidth, styles: styles)
    leftY += 6
    leftY = drawCompactSection(section: whatItDoes, x: leftX, startY: leftY, width: leftColumnWidth, styles: styles)
    leftY += 6
    _ = drawCompactSection(section: howToRun, x: leftX, startY: leftY, width: leftColumnWidth, styles: styles)

    let rightX = margin + leftColumnWidth + columnGap
    var rightY: CGFloat = 98
    rightY = drawCompactSection(section: howItWorks, x: rightX, startY: rightY, width: rightColumnWidth, styles: styles)
    rightY += 14
    drawRule(x: rightX, y: rightY, width: rightColumnWidth, color: ruleColor)
    rightY += 10
    _ = drawText(
      "Evidence basis: README.md, docs/overview.md, docs/dev-quickstart.md, src/App.tsx, src/components/AppShell/DesktopRuntime.tsx, src/meos/shell/MeOsProvider.tsx, src/meos/vfs/service.ts, src/meos/vfs/seed.ts, src/you/service.ts, src/third/ThirdProvider.tsx, and subsystem entry components.",
      x: rightX,
      y: rightY,
      width: rightColumnWidth,
      attributes: styles.footer
    )
  }
}

let outputPath = CommandLine.arguments.dropFirst().first ?? "output/pdf/terminal-os-summary.pdf"
let outputURL = URL(fileURLWithPath: outputPath)
try FileManager.default.createDirectory(at: outputURL.deletingLastPathComponent(), withIntermediateDirectories: true)

let view = SummaryView(frame: NSRect(x: 0, y: 0, width: pageWidth, height: pageHeight))
let pdfData = view.dataWithPDF(inside: view.bounds)
try pdfData.write(to: outputURL)

print(outputURL.path)
