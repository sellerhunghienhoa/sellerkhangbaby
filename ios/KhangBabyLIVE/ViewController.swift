import UIKit
import WebKit
import UserNotifications

class ViewController: UIViewController, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler, UIAdaptivePresentationControllerDelegate {
    private var webView: WKWebView!
    private var popupNavController: UINavigationController?
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
        closePopup()

        let popup = WKWebView(frame: .zero, configuration: configuration)
        popup.navigationDelegate = self
        popup.uiDelegate = self
        popup.allowsBackForwardNavigationGestures = true
        popup.translatesAutoresizingMaskIntoConstraints = false

        let popupVC = UIViewController()
        popupVC.view.backgroundColor = .systemBackground
        popupVC.title = "Đăng nhập Google"
        popupVC.view.addSubview(popup)

        NSLayoutConstraint.activate([
            popup.topAnchor.constraint(equalTo: popupVC.view.safeAreaLayoutGuide.topAnchor),
            popup.leadingAnchor.constraint(equalTo: popupVC.view.leadingAnchor),
            popup.trailingAnchor.constraint(equalTo: popupVC.view.trailingAnchor),
            popup.bottomAnchor.constraint(equalTo: popupVC.view.bottomAnchor)
        ])

        let closeBtn = UIBarButtonItem(title: "Đóng ✕", style: .plain, target: self, action: #selector(closePopup))
        closeBtn.tintColor = UIColor(red: 0.996, green: 0.173, blue: 0.333, alpha: 1.0)
        closeBtn.setTitleTextAttributes([
            .font: UIFont.systemFont(ofSize: 15, weight: .bold)
        ], for: .normal)
        popupVC.navigationItem.rightBarButtonItem = closeBtn

        let nav = UINavigationController(rootViewController: popupVC)
        nav.modalPresentationStyle = .pageSheet

        let appearance = UINavigationBarAppearance()
        appearance.configureWithOpaqueBackground()
        appearance.backgroundColor = UIColor(red: 1.0, green: 0.97, blue: 0.98, alpha: 1.0)
        appearance.titleTextAttributes = [
            .foregroundColor: UIColor(red: 0.2, green: 0.1, blue: 0.2, alpha: 1.0),
            .font: UIFont.systemFont(ofSize: 16, weight: .bold)
        ]
        nav.navigationBar.standardAppearance = appearance
        nav.navigationBar.scrollEdgeAppearance = appearance
        nav.navigationBar.compactAppearance = appearance
        nav.navigationBar.tintColor = UIColor(red: 0.996, green: 0.173, blue: 0.333, alpha: 1.0)
        nav.presentationController?.delegate = self

        self.popupWebView = popup
        self.popupNavController = nav

        if let presented = presentedViewController {
            presented.present(nav, animated: true, completion: nil)
        } else {
            present(nav, animated: true, completion: nil)
        }

        return popup
    }

    @objc private func closePopup() {
        popupWebView?.stopLoading()
        if let nav = popupNavController {
            if !nav.isBeingDismissed {
                nav.dismiss(animated: true) { [weak self] in
                    self?.popupWebView = nil
                    self?.popupNavController = nil
                }
            }
        } else {
            popupWebView = nil
            popupNavController = nil
        }
    }

    func presentationControllerDidDismiss(_ presentationController: UIPresentationController) {
        popupWebView?.stopLoading()
        popupWebView = nil
        popupNavController = nil
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
