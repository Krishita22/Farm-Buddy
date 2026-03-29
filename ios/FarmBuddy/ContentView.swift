import SwiftUI
import WebKit

struct WebView: UIViewRepresentable {
    let url: URL

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []

        // Allow microphone access for voice input
        if #available(iOS 14.5, *) {
            config.preferences.isElementFullscreenEnabled = true
        }

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 0.086, green: 0.396, blue: 0.239, alpha: 1) // farm-800
        webView.scrollView.bounces = false
        webView.allowsBackForwardNavigationGestures = true

        // Custom user agent
        webView.customUserAgent = "FarmBuddy-iOS/1.0"

        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        let request = URLRequest(url: url)
        webView.load(request)
    }
}

struct ContentView: View {
    // Point to local dev server or production URL
    @State private var serverURL = "http://localhost:5173"
    @State private var isLoading = true
    @State private var showError = false

    var body: some View {
        ZStack {
            Color(red: 0.086, green: 0.396, blue: 0.239) // farm-800
                .ignoresSafeArea()

            if let url = URL(string: serverURL) {
                WebView(url: url)
                    .ignoresSafeArea()
            }

            if isLoading {
                VStack(spacing: 16) {
                    Text("🌾")
                        .font(.system(size: 60))
                    Text("Farm Buddy")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                    ProgressView()
                        .tint(.white)
                }
            }
        }
        .onAppear {
            // Check if server is reachable
            checkServer()
        }
        .preferredColorScheme(.light)
    }

    func checkServer() {
        guard let url = URL(string: "\(serverURL)/api/health") else { return }
        URLSession.shared.dataTask(with: url) { data, response, error in
            DispatchQueue.main.async {
                if error != nil {
                    // Try network IP if localhost fails
                    serverURL = "http://10.65.57.74:5173"
                }
                isLoading = false
            }
        }.resume()
    }
}

#Preview {
    ContentView()
}
