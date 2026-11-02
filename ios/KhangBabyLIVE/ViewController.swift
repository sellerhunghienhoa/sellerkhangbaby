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
        contentController.add(self, name: "setNativeBadge")
        contentController.add(self, name: "scheduleReminder")

        let jsBridge = """
        window.sendNativeNotification = function(title, body, opts) {
            var payload = { title: String(title || 'Khang Baby'), body: String(body || '') };
            if (typeof opts === 'number') {
                payload.badge = opts;
            } else if (opts && typeof opts === 'object') {
                if (typeof opts.badge === 'number') payload.badge = opts.badge;
                if (typeof opts.delay === 'number') payload.delay = opts.delay;
            }
            if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.nativeNotify) {
                window.webkit.messageHandlers.nativeNotify.postMessage(payload);
            }
        };
        window.scheduleBackgroundReminder = function(title, body, delaySeconds, badge) {
            if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.scheduleReminder) {
                window.webkit.messageHandlers.scheduleReminder.postMessage({
                    title: String(title || 'Khang Baby LIVE'),
                    body: String(body || ''),
                    delay: Number(delaySeconds || 1800),
                    badge: Number(badge || 0)
                });
            }
        };
        window.setNativeBadge = function(count) {
            if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.setNativeBadge) {
                window.webkit.messageHandlers.setNativeBadge.postMessage(Number(count || 0));
            }
        };
        if (!window.Notification) {
            window.Notification = function(title, options) {
                options = options || {};
                window.sendNativeNotification(title, options.body || "", options);
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
            if let badge = dict["badge"] as? NSNumber, badge.intValue > 0 {
                content.badge = badge
            }

            let delay = dict["delay"] as? Double ?? 0.0
            let trigger: UNNotificationTrigger? = delay > 0 ? UNTimeIntervalNotificationTrigger(timeInterval: max(1.0, delay), repeats: false) : nil
            let request = UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: trigger)
            UNUserNotificationCenter.current().add(request, withCompletionHandler: nil)

            if let badge = dict["badge"] as? Int, badge >= 0 {
                DispatchQueue.main.async {
                    UIApplication.shared.applicationIconBadgeNumber = badge
                }
            }
        } else if message.name == "scheduleReminder", let dict = message.body as? [String: Any] {
            let title = dict["title"] as? String ?? "Khang Baby LIVE"
            let body = dict["body"] as? String ?? ""
            let delay = dict["delay"] as? Double ?? 1800.0
            let content = UNMutableNotificationContent()
            content.title = title
            content.body = body
            content.sound = .default
            if let badge = dict["badge"] as? NSNumber, badge.intValue > 0 {
                content.badge = badge
            }
            let trigger = UNTimeIntervalNotificationTrigger(timeInterval: max(60.0, delay), repeats: false)
            let request = UNNotificationRequest(identifier: "khangbaby_bg_reminder", content: content, trigger: trigger)
            UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: ["khangbaby_bg_reminder"])
            UNUserNotificationCenter.current().add(request, withCompletionHandler: nil)
        } else if message.name == "setNativeBadge", let count = message.body as? Int {
            DispatchQueue.main.async {
                UIApplication.shared.applicationIconBadgeNumber = max(0, count)
            }
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
