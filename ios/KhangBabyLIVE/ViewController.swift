import UIKit
import WebKit
import UserNotifications

class ViewController: UIViewController, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {
    private var webView: WKWebView!
    private var popupContainer: UIView?
    private var popupWebView: WKWebView?
    private let refreshControl = UIRefreshControl()
    private let progressView = UIProgressView(progressViewStyle: .default)
    private let appURL = URL(string: "https://sellerkhangbaby.online/")!

    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .darkContent
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 1.0, green: 0.97, blue: 0.98, alpha: 1.0)

        setupWebView()
        setupRefreshControl()
        setupProgressBar()
        loadApp()
    }

    private func setupWebView() {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.preferences.javaScriptCanOpenWindowsAutomatically = true

        let contentController = WKUserContentController()
        contentController.add(self, name: "nativeNotify")

        let jsBridge = """
        window.sendNativeNotification = function(title, body) {
            if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.nativeNotify) {
                window.webkit.messageHandlers.nativeNotify.postMessage({ title: String(title || 'Khang Baby'), body: String(body || '') });
            }
        };
        if (!window.Notification) {
            window.Notification = function(title, options) {
                options = options || {};
                window.sendNativeNotification(title, options.body || "");
            };
            window.Notification.permission = "granted";
            window.Notification.requestPermission = function() {
                return Promise.resolve("granted");
            };
        }
        """
        let userScript = WKUserScript(source: jsBridge, injectionTime: .atDocumentStart, forMainFrameOnly: false)
        contentController.addUserScript(userScript)
        config.userContentController = contentController

        let prefs = WKWebpagePreferences()
        prefs.allowsContentJavaScript = true
        config.defaultWebpagePreferences = prefs

        webView = WKWebView(frame: view.bounds, configuration: config)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.translatesAutoresizingMaskIntoConstraints = false
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.allowsBackForwardNavigationGestures = true
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.scrollView.backgroundColor = .clear

        // Keep genuine Safari UserAgent so Google OAuth never triggers 403 disallowed_useragent
        webView.customUserAgent = nil

        view.addSubview(webView)

        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: view.topAnchor),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            webView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
    }

    private func setupRefreshControl() {
        refreshControl.addTarget(self, action: #selector(handleRefresh), for: .valueChanged)
        refreshControl.tintColor = UIColor(red: 0.996, green: 0.173, blue: 0.333, alpha: 1.0)
        webView.scrollView.refreshControl = refreshControl
    }

    private func setupProgressBar() {
        progressView.translatesAutoresizingMaskIntoConstraints = false
        progressView.progressTintColor = UIColor(red: 0.996, green: 0.173, blue: 0.333, alpha: 1.0)
        progressView.trackTintColor = .clear
        view.addSubview(progressView)

        NSLayoutConstraint.activate([
            progressView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            progressView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            progressView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            progressView.heightAnchor.constraint(equalToConstant: 2.5)
        ])

        webView.addObserver(self, forKeyPath: #keyPath(WKWebView.estimatedProgress), options: .new, context: nil)
    }

    private func loadApp() {
        var request = URLRequest(url: appURL)
        request.cachePolicy = .useProtocolCachePolicy
        webView.load(request)
    }

    @objc private func handleRefresh() {
        webView.reload()
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        if message.name == "nativeNotify", let dict = message.body as? [String: Any] {
            let title = dict["title"] as? String ?? "Khang Baby"
            let body = dict["body"] as? String ?? ""

            let content = UNMutableNotificationContent()
            content.title = title
            content.body = body
            content.sound = .default

            let request = UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: nil)
            UNUserNotificationCenter.current().add(request, withCompletionHandler: nil)
        }
    }

    override func observeValue(forKeyPath keyPath: String?, of object: Any?, change: [NSKeyValueChangeKey : Any]?, context: UnsafeMutableRawPointer?) {
        if keyPath == "estimatedProgress" {
            progressView.progress = Float(webView.estimatedProgress)
            progressView.isHidden = webView.estimatedProgress >= 1.0
        }
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        refreshControl.endRefreshing()
        progressView.isHidden = true
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        refreshControl.endRefreshing()
        progressView.isHidden = true
    }

    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        let container = UIView(frame: view.bounds)
        container.backgroundColor = .white
        container.autoresizingMask = [.flexibleWidth, .flexibleHeight]

        let topBar = UIView(frame: CGRect(x: 0, y: 0, width: view.bounds.width, height: 54))
        topBar.backgroundColor = UIColor(red: 0.98, green: 0.95, blue: 0.97, alpha: 1.0)
        topBar.autoresizingMask = [.flexibleWidth, .flexibleBottomMargin]

        let titleLabel = UILabel(frame: CGRect(x: 16, y: 14, width: 220, height: 26))
        titleLabel.text = "Đăng nhập Google"
        titleLabel.font = UIFont.systemFont(ofSize: 15, weight: .bold)
        titleLabel.textColor = UIColor(red: 0.2, green: 0.1, blue: 0.2, alpha: 1.0)
        topBar.addSubview(titleLabel)

        let closeBtn = UIButton(type: .system)
        closeBtn.frame = CGRect(x: view.bounds.width - 86, y: 12, width: 72, height: 30)
        closeBtn.autoresizingMask = [.flexibleLeftMargin]
        closeBtn.setTitle("Đóng ✕", for: .normal)
        closeBtn.titleLabel?.font = UIFont.systemFont(ofSize: 14, weight: .bold)
        closeBtn.tintColor = UIColor(red: 0.996, green: 0.173, blue: 0.333, alpha: 1.0)
        closeBtn.addTarget(self, action: #selector(closePopup), for: .touchUpInside)
        topBar.addSubview(closeBtn)
        container.addSubview(topBar)

        let popup = WKWebView(frame: CGRect(x: 0, y: 54, width: view.bounds.width, height: view.bounds.height - 54), configuration: configuration)
        popup.navigationDelegate = self
        popup.uiDelegate = self
        popup.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        container.addSubview(popup)

        view.addSubview(container)
        self.popupContainer = container
        self.popupWebView = popup
        return popup
    }

    @objc private func closePopup() {
        popupWebView?.stopLoading()
        popupContainer?.removeFromSuperview()
        popupContainer = nil
        popupWebView = nil
    }

    func webViewDidClose(_ webView: WKWebView) {
        if webView == popupWebView {
            closePopup()
        }
    }

    deinit {
        webView.removeObserver(self, forKeyPath: #keyPath(WKWebView.estimatedProgress))
    }
}
