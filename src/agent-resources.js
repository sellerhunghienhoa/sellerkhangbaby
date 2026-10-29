const GOOGLE_ISSUER = 'https://accounts.google.com';
const GOOGLE_DISCOVERY = `${GOOGLE_ISSUER}/.well-known/openid-configuration`;
const OAUTH_SCOPES = { openid: 'Authenticate the Google account.', email: 'Read the verified Google email used for the Admin allowlist.' };

function acceptRanges(value) {
  return (value || '*/*').split(',').map((part, index) => {
    const [media, ...parameters] = part.trim().toLowerCase().split(';').map(item => item.trim());
    let q = 1;
    for (const parameter of parameters) {
      const [name, raw] = parameter.split('=');
      if (name === 'q') q = Number(raw);
    }
    return { media, q: Number.isFinite(q) && q >= 0 && q <= 1 ? q : 0, index };
  });
}

function preferenceFor(type, ranges) {
  const [group] = type.split('/');
  const matches = ranges.filter(item => item.media === type || item.media === `${group}/*` || item.media === '*/*');
  if (!matches.length) return { q: 0, specificity: -1, index: Number.MAX_SAFE_INTEGER };
  matches.sort((left, right) => {
    const specificity = value => value.media === type ? 2 : value.media === `${group}/*` ? 1 : 0;
    return specificity(right) - specificity(left) || left.index - right.index;
  });
  const match = matches[0];
  return { q: match.q, specificity: match.media === type ? 2 : match.media === `${group}/*` ? 1 : 0, index: match.index };
}

export function prefersMarkdown(value) {
  const ranges = acceptRanges(value);
  const markdown = preferenceFor('text/markdown', ranges);
  const html = preferenceFor('text/html', ranges);
  if (markdown.q <= 0) return false;
  if (markdown.q !== html.q) return markdown.q > html.q;
  if (markdown.specificity !== html.specificity) return markdown.specificity > html.specificity;
  return markdown.index < html.index;
}

function response(body, request, contentType, init = {}) {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', contentType);
  headers.set('Vary', 'Accept');
  headers.set('X-Content-Type-Options', 'nosniff');
  return new Response(request.method === 'HEAD' ? null : body, { ...init, headers });
}

function homepageMarkdown(origin) {
  return `# Khang Baby LIVE KPI

Dashboard quản lý GMV, phiên LIVE, đơn hàng, Affiliate và KPI nhân sự cho shopkhangbaby và mekhangsua.

## Dành cho agent

- [Tài liệu API](${origin}/docs)
- [OpenAPI 3.1](${origin}/openapi.json)
- [OAuth protected-resource metadata](${origin}/.well-known/oauth-protected-resource)
- [llms.txt](${origin}/llms.txt)

API chỉ nhận Bearer token của Firebase hoặc Google OAuth 2.0 từ tài khoản Admin đã xác minh. Giao diện web vẫn được phục vụ khi client yêu cầu HTML.
`;
}

function developerDocs(origin) {
  return `# Khang Baby LIVE KPI Workers API

Tài liệu dành cho agent và nhà phát triển của Khang Baby LIVE KPI chạy trên Cloudflare Workers.

## Khám phá

- [OpenAPI 3.1](${origin}/openapi.json)
- [OAuth protected-resource metadata](${origin}/.well-known/oauth-protected-resource)
- [Google OAuth 2.0 discovery](${GOOGLE_DISCOVERY})
- [llms.txt](${origin}/llms.txt)

## Xác thực và quyền

Gửi token qua header \`Authorization: Bearer <token>\`. API chấp nhận Firebase ID token hiện có của ứng dụng hoặc Google OAuth 2.0 access token có scope \`openid email\`. Email phải được Google xác minh và phải thuộc tài khoản Admin của dự án. Mọi endpoint nghiệp vụ hiện đều là Admin-only.

## Nhóm API

- \`kpi.read\`: đọc trạng thái kết nối và dung lượng.
- \`kpi.sync\`: đồng bộ LIVE, đơn, hoàn và Affiliate.
- \`kpi.connections.manage\`: bắt đầu ủy quyền TikTok và làm mới token.

Các tên trên mô tả quyền nghiệp vụ trong tài liệu; OAuth token tối thiểu chỉ cần \`openid email\`, còn Worker tiếp tục áp dụng allowlist Admin cho từng request.
`;
}

function llmsText(origin) {
  return `# Khang Baby LIVE KPI

> Cloudflare Workers dashboard for TikTok Shop LIVE GMV, orders, Affiliate reconciliation, staff KPI, and storage monitoring.

The website serves Vietnamese operators. Public developer resources are machine-readable; business APIs require a verified Admin bearer token.

## Developer resources

- [Workers API documentation](${origin}/docs): Authentication, permissions, and endpoint groups.
- [OpenAPI specification](${origin}/openapi.json): OpenAPI 3.1 operations and OAuth scopes.
- [OAuth protected resource metadata](${origin}/.well-known/oauth-protected-resource): RFC 9728 resource and scope discovery.
- [Google authorization server metadata](${origin}/.well-known/oauth-authorization-server): Redirects to the canonical Google discovery document.

## Product

- [Khang Baby LIVE KPI dashboard](${origin}/): Human interface; request \`text/markdown\` for an agent summary.
`;
}

function openApi(origin) {
  const security = [{ googleOAuth: ['openid', 'email'] }, { firebaseIdToken: [] }];
  const dateRange = {
    type: 'object', required: ['from', 'to'], additionalProperties: true,
    properties: { from: { type: 'string', format: 'date' }, to: { type: 'string', format: 'date' } }
  };
  const jsonResponse = description => ({ description, content: { 'application/json': { schema: { type: 'object', additionalProperties: true } } } });
  const post = (operationId, summary, permission, schema = dateRange) => ({
    operationId, summary, description: `Required business permission: ${permission}.`, security,
    ...(schema ? { requestBody: { required: true, content: { 'application/json': { schema } } } } : {}),
    responses: { 200: jsonResponse('Successful response.'), 400: jsonResponse('Invalid request.'), 401: jsonResponse('Bearer token missing or invalid.'), 403: jsonResponse('Verified Admin account required.') }
  });
  const sameOriginHeader = { name: 'Origin', in: 'header', required: true, description: `Must equal ${origin}.`, schema: { type: 'string', const: origin } };
  return {
    openapi: '3.1.0',
    info: {
      title: 'Khang Baby LIVE KPI Workers API', version: '2.0.0',
      description: 'Admin API for TikTok Shop LIVE, orders, Affiliate reconciliation, token connections, and storage usage.',
      license: { name: 'Private application' }
    },
    servers: [{ url: origin }],
    externalDocs: { description: 'Agent and developer documentation', url: `${origin}/docs` },
    security,
    paths: {
      '/api/tiktok/status': { get: { operationId: 'getTikTokStatus', summary: 'Read safe TikTok connection status', description: 'Required business permission: kpi.read.', security, responses: { 200: jsonResponse('Connection status without tokens.'), 401: jsonResponse('Bearer token missing or invalid.'), 403: jsonResponse('Verified Admin account required.') } } },
      '/api/storage/usage': { get: { operationId: 'getStorageUsage', summary: 'Read GitHub, Firebase, and Cloudflare usage', description: 'Required business permission: kpi.read.', security, responses: { 200: jsonResponse('Provider usage snapshot.'), 401: jsonResponse('Bearer token missing or invalid.'), 403: jsonResponse('Verified Admin account required.') } } },
      '/api/tiktok/live/sync': { post: post('syncLiveSessions', 'Synchronize LIVE sessions', 'kpi.sync') },
      '/api/tiktok/live/core-stats': { post: post('syncCreatorLiveStats', 'Refresh Creator LIVE statistics', 'kpi.sync', { ...dateRange, properties: { ...dateRange.properties, creator: { type: 'string', enum: ['shopkhangbaby', 'mekhangsua'] }, liveIds: { type: 'array', items: { type: 'string' } } } }) },
      '/api/tiktok/affiliate/sync': { post: post('syncAffiliate', 'Synchronize Affiliate data', 'kpi.sync', { ...dateRange, properties: { ...dateRange.properties, creator: { type: 'string', enum: ['shopkhangbaby', 'mekhangsua'] } } }) },
      '/api/tiktok/orders/sync': { post: post('syncOrders', 'Synchronize Seller orders and returns', 'kpi.sync') },
      '/api/tiktok/tokens/refresh': { post: { ...post('refreshTokens', 'Refresh all TikTok connections', 'kpi.connections.manage', null), parameters: [sameOriginHeader] } },
      '/api/tiktok/creator/{creator}/authorize': { post: { ...post('authorizeCreator', 'Start Creator OAuth authorization', 'kpi.connections.manage', null), parameters: [{ name: 'creator', in: 'path', required: true, schema: { type: 'string', enum: ['shopkhangbaby', 'mekhangsua'] } }, sameOriginHeader] } },
      '/api/tiktok/seller/{connection}/authorize': { post: { ...post('authorizeSeller', 'Start Seller OAuth authorization', 'kpi.connections.manage', null), parameters: [{ name: 'connection', in: 'path', required: true, schema: { type: 'string', enum: ['shopkhangbaby'] } }, sameOriginHeader] } }
    },
    components: {
      securitySchemes: {
        googleOAuth: {
          type: 'oauth2', description: 'Google OAuth 2.0 access token for the verified project Admin.',
          flows: { authorizationCode: { authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth', tokenUrl: 'https://oauth2.googleapis.com/token', scopes: OAUTH_SCOPES } }
        },
        firebaseIdToken: { type: 'http', scheme: 'bearer', bearerFormat: 'Firebase ID token', description: 'Firebase Authentication ID token used by the existing web application.' }
      }
    },
    'x-oauth-protected-resource': `${origin}/.well-known/oauth-protected-resource`
  };
}

export function publicAgentResource(request) {
  if (!['GET', 'HEAD'].includes(request.method)) return null;
  const url = new URL(request.url);
  const origin = url.origin;
  if (url.pathname === '/' && prefersMarkdown(request.headers.get('Accept'))) {
    return response(homepageMarkdown(origin), request, 'text/markdown; charset=utf-8', { headers: { 'Cache-Control': 'public, max-age=300' } });
  }
  if (url.pathname === '/llms.txt') return response(llmsText(origin), request, 'text/markdown; charset=utf-8', { headers: { 'Cache-Control': 'public, max-age=3600' } });
  if (url.pathname === '/docs') return response(developerDocs(origin), request, 'text/markdown; charset=utf-8', { headers: { 'Cache-Control': 'public, max-age=3600' } });
  if (url.pathname === '/openapi.json') return response(JSON.stringify(openApi(origin), null, 2), request, 'application/json; charset=utf-8', { headers: { 'Cache-Control': 'public, max-age=3600' } });
  if (url.pathname === '/.well-known/oauth-protected-resource') {
    return response(JSON.stringify({
      resource: origin,
      authorization_servers: [GOOGLE_ISSUER],
      scopes_supported: Object.keys(OAUTH_SCOPES),
      bearer_methods_supported: ['header'],
      resource_name: 'Khang Baby LIVE KPI Workers API',
      resource_documentation: `${origin}/docs`
    }), request, 'application/json; charset=utf-8', { headers: { 'Cache-Control': 'public, max-age=3600' } });
  }
  if (url.pathname === '/.well-known/oauth-authorization-server') {
    return new Response(null, { status: 302, headers: { Location: GOOGLE_DISCOVERY, 'Cache-Control': 'public, max-age=3600' } });
  }
  if (url.pathname === '/sitemap.xml') {
    const locations = ['/', '/docs', '/openapi.json', '/llms.txt'].map(path => `<url><loc>${origin}${path}</loc></url>`).join('');
    return response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${locations}</urlset>`, request, 'application/xml; charset=utf-8', { headers: { 'Cache-Control': 'public, max-age=3600' } });
  }
  return null;
}

export function negotiateAssetResponse(request, assetResponse) {
  const url = new URL(request.url);
  if (assetResponse.status === 404 && prefersMarkdown(request.headers.get('Accept'))) {
    return response(`# Không tìm thấy trang

Đường dẫn \`${url.pathname}\` không tồn tại trên Khang Baby LIVE KPI. Xem [tài liệu dành cho agent](${url.origin}/docs) hoặc [llms.txt](${url.origin}/llms.txt).
`, request, 'text/markdown; charset=utf-8', { status: 404, headers: { 'Cache-Control': 'no-store' } });
  }
  if (url.pathname !== '/' && assetResponse.status !== 404) return assetResponse;
  const headers = new Headers(assetResponse.headers);
  const vary = (headers.get('Vary') || '').split(',').map(value => value.trim()).filter(Boolean);
  if (!vary.some(value => value.toLowerCase() === 'accept')) vary.push('Accept');
  headers.set('Vary', vary.join(', '));
  if (url.pathname === '/') headers.append('Link', `</llms.txt>; rel="alternate"; type="text/markdown"`);
  return new Response(request.method === 'HEAD' ? null : assetResponse.body, { status: assetResponse.status, statusText: assetResponse.statusText, headers });
}
