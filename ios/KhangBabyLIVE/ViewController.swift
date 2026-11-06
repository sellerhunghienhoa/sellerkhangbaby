import UIKit
import WebKit
import UserNotifications

class ViewController: UIViewController, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler, UIAdaptivePresentationControllerDelegate {
    private var webView: WKWebView!
    private var popupNavController: UINavigationController?
    private var popupWebView: WKWebView?
    private let refreshControl = UIRefreshControl()
    private let appURL = URL(string: "https://sellerkhangbaby.online/")!

    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .darkContent
    }

    private var pendingNotificationAction: String?

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 1.0, green: 0.97, blue: 0.98, alpha: 1.0)

        setupWebView()
        setupRefreshControl()
        NotificationCenter.default.addObserver(self, selector: #selector(handleNotificationAction(_:)), name: NSNotification.Name("HandleNotificationAction"), object: nil)
        loadApp()
    }

    @objc private func handleNotificationAction(_ notification: Notification) {
        guard let userInfo = notification.userInfo else { return }
        let act = userInfo["act"] as? String ?? ""
        let title = userInfo["title"] as? String ?? ""

        let js: String
        if !act.isEmpty,
           let actionData = try? JSONSerialization.data(withJSONObject: [act]),
           let encodedAction = String(data: actionData, encoding: .utf8) {
            js = "if (typeof handleNotificationAction === 'function') { handleNotificationAction(\(encodedAction)[0]); }"
        } else if title.contains("đơn Shop") {
            js = "if (typeof openTodayShopOrders === 'function') { openTodayShopOrders(); }"
        } else if title.contains("chưa gán") {
            js = "if (typeof openUnassignedSessions === 'function') { openUnassignedSessions(); }"
        } else if title.contains("kết thúc") || title.contains("đối soát") {
            js = "if (typeof openPendingRecSessions === 'function') { openPendingRecSessions(); }"
        } else if title.contains("phiên LIVE mới") {
            js = "if (typeof openTodaySessions === 'function') { openTodaySessions(); }"
        } else if title.contains("đơn hoàn") {
            js = "if (typeof openPendingReturns === 'function') { openPendingReturns(); }"
        } else {
            js = ""
        }

        if !js.isEmpty {
            if webView.isLoading {
                pendingNotificationAction = js
            } else {
                DispatchQueue.main.async {
                    self.webView.evaluateJavaScript(js, completionHandler: nil)
                }
            }
        }
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
            var payload = { title: String(title || 'Seller KBB'), body: String(body || '') };
            if (typeof opts === 'number') {
                payload.badge = opts;
            } else if (opts && typeof opts === 'object') {
                if (typeof opts.badge === 'number') payload.badge = opts.badge;
                if (typeof opts.delay === 'number') payload.delay = opts.delay;
                if (opts.act) payload.act = String(opts.act);
            }
            if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.nativeNotify) {
                window.webkit.messageHandlers.nativeNotify.postMessage(payload);
            }
        };
        window.scheduleBackgroundReminder = function(title, body, delaySeconds, badge) {
            if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.scheduleReminder) {
                window.webkit.messageHandlers.scheduleReminder.postMessage({
                    title: String(title || 'Seller KBB'),
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

    private func loadApp() {
        var request = URLRequest(url: appURL)
        request.cachePolicy = .useProtocolCachePolicy
        webView.load(request)
    }

    @objc private func handleRefresh() {
        if webView.url == nil || webView.url?.scheme != "https" {
            loadApp()
        } else {
            webView.reload()
        }
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        if message.name == "nativeNotify", let dict = message.body as? [String: Any] {
            let title = dict["title"] as? String ?? "Seller KBB"
            let body = dict["body"] as? String ?? ""
            let act = dict["act"] as? String ?? ""

            let content = UNMutableNotificationContent()
            content.title = title
            content.body = body
            content.sound = .default
            if !act.isEmpty {
                content.userInfo = ["act": act]
            }
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
            let title = dict["title"] as? String ?? "Seller KBB"
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
            if !body.isEmpty && delay > 0 {
                UNUserNotificationCenter.current().add(request, withCompletionHandler: nil)
            }
        } else if message.name == "setNativeBadge", let count = message.body as? Int {
            DispatchQueue.main.async {
                UIApplication.shared.applicationIconBadgeNumber = max(0, count)
            }
        }
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        refreshControl.endRefreshing()
        if let pending = pendingNotificationAction {
            pendingNotificationAction = nil
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                webView.evaluateJavaScript(pending, completionHandler: nil)
            }
        }
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        refreshControl.endRefreshing()
        showOfflinePageIfNeeded(error: error)
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        refreshControl.endRefreshing()
        showOfflinePageIfNeeded(error: error)
    }

    private func showOfflinePageIfNeeded(error: Error) {
        let nsError = error as NSError
        if nsError.domain == NSURLErrorDomain && nsError.code != NSURLErrorCancelled {
            let offlineHTML = """
            <!DOCTYPE html>
            <html lang="vi">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
              <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body {
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                  background-color: #FFF7FA;
                  color: #2D1A24;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  min-height: 100vh;
                  padding: 24px;
                  text-align: center;
                  -webkit-user-select: none;
                }
                .offline-card {
                  background: #FFFFFF;
                  border: 1px solid #FCE7F3;
                  border-radius: 20px;
                  padding: 32px 24px;
                  max-width: 360px;
                  box-shadow: 0 10px 25px -5px rgba(236, 72, 153, 0.1);
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                }
                .icon-circle {
                  width: 64px;
                  height: 64px;
                  background: #FDF2F8;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  margin-bottom: 20px;
                  color: #EC4899;
                }
                h2 {
                  font-size: 19px;
                  font-weight: 700;
                  color: #831843;
                  margin-bottom: 8px;
                }
                p {
                  font-size: 14px;
                  color: #705D68;
                  line-height: 1.5;
                  margin-bottom: 24px;
                }
                .retry-btn {
                  display: inline-block;
                  width: 100%;
                  padding: 13px 20px;
                  background: linear-gradient(135deg, #EC4899 0%, #DB2777 100%);
                  color: #FFFFFF;
                  font-size: 15px;
                  font-weight: 600;
                  border-radius: 12px;
                  text-decoration: none;
                  box-shadow: 0 4px 12px rgba(236, 72, 153, 0.3);
                  cursor: pointer;
                  border: none;
                }
              </style>
            </head>
            <body>
              <div class="offline-card">
                <div class="icon-circle">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                    <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path>
                    <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path>
                    <path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path>
                    <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path>
                    <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
                    <line x1="12" y1="20" x2="12.01" y2="20"></line>
                  </svg>
                </div>
                <h2>Không có kết nối mạng</h2>
                <p>Vui lòng kiểm tra kết nối Wi-Fi hoặc 4G/5G trên thiết bị của bạn rồi thử lại.</p>
                <button class="retry-btn" onclick="window.location.href='https://sellerkhangbaby.online/'">Thử lại ngay</button>
              </div>
            </body>
            </html>
            """
            webView.loadHTMLString(offlineHTML, baseURL: nil)
        }
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
        nav.modalPresentationStyle = .fullScreen

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
        NotificationCenter.default.removeObserver(self)
    }
}
