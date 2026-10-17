import SwiftUI
import WidgetKit

// Home-screen widgets from the design (6g): the next deadline (medium and small) and a
// shortcut to scanning. The app writes the deadline into the shared App Group whenever its
// documents change; the widget only reads it and counts the days down itself.

private let appGroup = "group.com.opas.app"

// Paper palette (global.css :root). Widgets can't load the app's fonts, so the serif and
// mono faces fall back to the system's New York and SF Mono, which keep the same voice.
private extension Color {
    static let paper = Color(red: 0.949, green: 0.929, blue: 0.886)
    static let surface = Color(red: 0.918, green: 0.890, blue: 0.827)
    static let ink = Color(red: 0.129, green: 0.118, blue: 0.086)
    static let muted = Color(red: 0.400, green: 0.376, blue: 0.329)
    static let pine = Color(red: 0.208, green: 0.314, blue: 0.247)
    static let brick = Color(red: 0.612, green: 0.227, blue: 0.173)
    static let ochre = Color(red: 0.514, green: 0.345, blue: 0.090)
}

struct DeadlineData: Codable {
    struct Labels: Codable {
        let header: String
        let daysLeft: String
        let dayLeft: String
        let dueToday: String
        let due: String
        let empty: String
        let scanHeader: String
        let scanCta: String
    }
    let documentId: String?
    let title: String?
    let authority: String?
    /** YYYY-MM-DD */
    let date: String?
    let dateLabel: String?
    let labels: Labels

    static func load() -> DeadlineData? {
        guard let json = UserDefaults(suiteName: appGroup)?.string(forKey: "nextDeadline"),
              let data = json.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(DeadlineData.self, from: data)
    }

    func daysLeft(from now: Date) -> Int? {
        guard let date else { return nil }
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.dateFormat = "yyyy-MM-dd"
        guard let due = f.date(from: date) else { return nil }
        let cal = Calendar.current
        return cal.dateComponents([.day], from: cal.startOfDay(for: now), to: cal.startOfDay(for: due)).day
    }
}

struct Entry: TimelineEntry {
    let date: Date
    let data: DeadlineData?
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> Entry { Entry(date: .now, data: nil) }

    func getSnapshot(in context: Context, completion: @escaping (Entry) -> Void) {
        completion(Entry(date: .now, data: DeadlineData.load()))
    }

    // The count changes at midnight, so redraw then; the app also reloads on every change.
    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> Void) {
        let midnight = Calendar.current.startOfDay(for: .now.addingTimeInterval(86_400))
        completion(Timeline(entries: [Entry(date: .now, data: DeadlineData.load())], policy: .after(midnight)))
    }
}

/// The brand mark: three waypoints on the ring.
struct Mark: View {
    var size: CGFloat
    var light = false
    var body: some View {
        Canvas { ctx, s in
            let k = s.width / 140
            var arc = Path()
            arc.addArc(center: CGPoint(x: 70 * k, y: 70 * k), radius: 43 * k,
                       startAngle: .degrees(200), endAngle: .degrees(293), clockwise: false)
            ctx.stroke(arc, with: .color(light ? .paper : .pine), style: StrokeStyle(lineWidth: 6 * k, lineCap: .round))
            ctx.fill(Path(ellipseIn: CGRect(x: 27 * k, y: 37 * k, width: 30 * k, height: 30 * k)), with: .color(Color(red: 0.804, green: 0.749, blue: 0.651)))
            ctx.fill(Path(ellipseIn: CGRect(x: 81 * k, y: 31 * k, width: 30 * k, height: 30 * k)), with: .color(light ? .paper : .pine))
            ctx.fill(Path(ellipseIn: CGRect(x: 64 * k, y: 82 * k, width: 32 * k, height: 32 * k)), with: .color(.ochre))
        }
        .frame(width: size, height: size)
    }
}

struct NextDeadlineView: View {
    @Environment(\.widgetFamily) var family
    let entry: Entry

    var body: some View {
        let data = entry.data
        let days = data?.daysLeft(from: entry.date)
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text((data?.labels.header ?? "Opas · Next deadline").uppercased())
                    .font(.system(size: 9.5, weight: .semibold)).tracking(1.6)
                    .foregroundStyle(Color.muted)
                Spacer()
                Mark(size: 20)
            }
            Spacer(minLength: 8)
            if let data, let days, days >= 0, let title = data.title {
                let tone: Color = days <= 3 ? .brick : days <= 7 ? .ochre : .ink
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    if days == 0 {
                        Text(data.labels.dueToday.uppercased())
                            .font(.system(size: 13, weight: .semibold)).tracking(1.1).foregroundStyle(tone)
                    } else {
                        Text("\(days)").font(.system(size: 40, weight: .medium, design: .serif)).foregroundStyle(tone)
                        Text((days == 1 ? data.labels.dayLeft : data.labels.daysLeft).uppercased())
                            .font(.system(size: 11, weight: .semibold)).tracking(1.1).foregroundStyle(tone)
                    }
                }
                Text(title)
                    .font(.system(size: family == .systemSmall ? 14 : 17, weight: .medium, design: .serif))
                    .foregroundStyle(Color.ink)
                    .lineLimit(family == .systemSmall ? 2 : 1)
                    .padding(.top, 6)
                Text([data.authority, "\(data.labels.due) \(data.dateLabel ?? "")"].compactMap { $0 }.joined(separator: " · ").uppercased())
                    .font(.system(size: 10, design: .monospaced)).tracking(0.5)
                    .foregroundStyle(Color.muted)
                    .lineLimit(1)
                    .padding(.top, 4)
            } else {
                Text(data?.labels.empty ?? "Nothing due. You're on top of it.")
                    .font(.system(size: 15, design: .serif)).foregroundStyle(Color.ink)
            }
        }
        .containerBackground(Color.paper, for: .widget)
        .widgetURL(URL(string: data?.documentId.map { "opas:///document/\($0)" } ?? "opas:///alerts"))
    }
}

struct ScanView: View {
    let entry: Entry
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text((entry.data?.labels.scanHeader ?? "Opas · Scan").uppercased())
                .font(.system(size: 9, weight: .semibold)).tracking(1.3)
                .foregroundStyle(Color.muted)
            Spacer()
            Text(entry.data?.labels.scanCta ?? "Tap to scan a new letter →")
                .font(.system(size: 16, weight: .medium, design: .serif))
                .foregroundStyle(Color.ink)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .containerBackground(Color.surface, for: .widget)
        .widgetURL(URL(string: "opas:///scan"))
    }
}

struct NextDeadlineWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "NextDeadline", provider: Provider()) { NextDeadlineView(entry: $0) }
            .configurationDisplayName("Next deadline")
            .description("The next thing a letter asks of you, counting down.")
            .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct ScanWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "Scan", provider: Provider()) { ScanView(entry: $0) }
            .configurationDisplayName("Scan a letter")
            .description("Open the camera straight from your home screen.")
            .supportedFamilies([.systemSmall])
    }
}

@main
struct OpasWidgets: WidgetBundle {
    var body: some Widget {
        NextDeadlineWidget()
        ScanWidget()
    }
}
