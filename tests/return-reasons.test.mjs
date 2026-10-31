import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeSellerOrder, normalizeSellerReturn, translateReturnReason } from '../src/worker.js';

test('translateReturnReason translates all common TikTok return reasons to Vietnamese', () => {
  assert.equal(translateReturnReason("Product doesn't match description"), 'Sản phẩm không đúng như mô tả');
  assert.equal(translateReturnReason("Product doesn’t match description"), 'Sản phẩm không đúng như mô tả');
  assert.equal(translateReturnReason("The product does not match description"), 'Sản phẩm không đúng như mô tả');
  assert.equal(translateReturnReason("Wrong product sent"), 'Giao sai sản phẩm / sai phân loại');
  assert.equal(translateReturnReason("Package or product is damaged"), 'Hàng hoặc bao bì bị hư hỏng / móp méo');
  assert.equal(translateReturnReason("Item is defective or doesn't work"), 'Sản phẩm bị lỗi / không hoạt động');
  assert.equal(translateReturnReason("Missing items or accessories"), 'Thiếu hàng hoặc thiếu phụ kiện / quà tặng');
  assert.equal(translateReturnReason("Changed mind"), 'Đổi ý không muốn mua nữa');
  assert.equal(translateReturnReason("Arrived too late"), 'Giao hàng quá trễ');
  assert.equal(translateReturnReason("Suspected counterfeit product"), 'Nghi ngờ hàng giả / không chính hãng');
  assert.equal(translateReturnReason("Order placed by mistake"), 'Đổi ý không muốn mua nữa');
  assert.equal(translateReturnReason("Parcel not delivered"), 'Chưa nhận được kiện hàng');
  assert.equal(translateReturnReason("Expired product"), 'Sản phẩm cận hạn / hết hạn sử dụng');
  assert.equal(translateReturnReason("Chưa có lý do"), 'Chưa có lý do');
  assert.equal(translateReturnReason(""), 'Chưa có lý do');
});

test('normalizeSellerReturn normalizes return reasons into Vietnamese while preserving liability default', () => {
  const timestamp = 1792600000;
  const rawOrder = {
    id: '777', status: 'DELIVERED', create_time: timestamp, update_time: timestamp, delivery_time: timestamp,
    payment: { currency: 'VND', sub_total: '100000', total_amount: '115000' },
    line_items: [{ id: '11', room_id: '123', product_name: 'Sữa bột Meiji', seller_sku: 'MEIJI-0' }],
    recipient_address: { name: 'private' }
  };
  const parent = normalizeSellerOrder(rawOrder, '99');

  const rawReturn1 = {
    order_id: '777', return_id: '881', create_time: timestamp + 86400,
    return_status: 'RETURN_OR_REFUND_REQUEST_COMPLETE',
    return_reason: "Product doesn't match description",
    refund_amount: { currency: 'VND', refund_subtotal: '100000', refund_total: '100000' },
    return_line_items: []
  };
  const norm1 = normalizeSellerReturn(rawReturn1, '99', parent);
  assert.equal(norm1.reasonLabel, 'Sản phẩm không đúng như mô tả');
  assert.equal(norm1.liability, 'Chưa xác định');

  const rawReturn2 = {
    order_id: '777', return_id: '882', create_time: timestamp + 86400,
    return_status: 'RETURN_OR_REFUND_REQUEST_COMPLETE',
    return_reason: "Wrong product sent",
    refund_amount: { currency: 'VND', refund_subtotal: '50000', refund_total: '50000' },
    return_line_items: []
  };
  const norm2 = normalizeSellerReturn(rawReturn2, '99', parent);
  assert.equal(norm2.reasonLabel, 'Giao sai sản phẩm / sai phân loại');

  const rawReturn3 = {
    order_id: '777', return_id: '883', create_time: timestamp + 86400,
    return_status: 'RETURN_OR_REFUND_REQUEST_COMPLETE',
    return_reason: "Package or product is damaged",
    refund_amount: { currency: 'VND', refund_subtotal: '50000', refund_total: '50000' },
    return_line_items: []
  };
  const norm3 = normalizeSellerReturn(rawReturn3, '99', parent);
  assert.equal(norm3.reasonLabel, 'Hàng hoặc bao bì bị hư hỏng / móp méo');
});
