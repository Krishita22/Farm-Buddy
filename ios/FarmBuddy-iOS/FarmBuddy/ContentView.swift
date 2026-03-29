import SwiftUI
import WebKit

struct WebView: UIViewRepresentable {
    let url: URL

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.scrollView.bounces = false
        webView.allowsBackForwardNavigationGestures = true
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        webView.load(URLRequest(url: url))
    }
}

struct ContentView: View {
    @State private var currentURL = "http://169.254.12.209:5173"
    @State private var isLoading = true
    @State private var connectionFailed = false

    var body: some View {
        ZStack {
            if let url = URL(string: currentURL) {
                WebView(url: url)
                    .ignoresSafeArea()
            }

            if connectionFailed {
                VStack(spacing: 16) {
                    Text("🌾").font(.system(size: 60))
                    Text("Farm Buddy").font(.title2).fontWeight(.bold)
                    Text("Trying to connect...").font(.caption).foregroundColor(.gray)
                    ProgressView()
                    Text("Make sure Mac server is running").font(.caption2).foregroundColor(.gray)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Color(red: 0.97, green: 0.98, blue: 0.96))
            }
        }
        .onAppear { tryConnect() }
    }

    func tryConnect() {
        // Try USB direct IP first, then WiFi IP
        let urls = [
            "http://169.254.12.209:5173",
            "http://10.65.57.74:5173",
            "http://localhost:5173"
        ]

        for testURL in urls {
            guard let url = URL(string: "\(testURL.replacingOccurrences(of: ":5173", with: ":8000"))/api/health") else { continue }
            var request = URLRequest(url: url)
            request.timeoutInterval = 3

            URLSession.shared.dataTask(with: request) { data, response, error in
                if error == nil, let response = response as? HTTPURLResponse, response.statusCode == 200 {
                    DispatchQueue.main.async {
                        self.currentURL = testURL
                        self.isLoading = false
                        self.connectionFailed = false
                    }
                }
            }.resume()
        }

        // If nothing responds in 5 seconds, show error
        DispatchQueue.main.asyncAfter(deadline: .now() + 5) {
            if isLoading { connectionFailed = true }
        }
    }
}

#Preview {
    ContentView()
}
