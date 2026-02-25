// A simple simulation: in real life, the tablet app calls printer directly.
// Here server prepares receipt payload and returns it to client.
function buildReceipt(order, items) {
  let lines = [];
  lines.push('---- OFFLINE POS ----');
  lines.push(`Order ID: ${order.id}`);
  lines.push(`Date: ${new Date(order.created_at).toLocaleString()}`);
  lines.push('----------------------');
  items.forEach(it => {
    lines.push(`${it.name} x${it.quantity}  ${parseFloat(it.unit_price).toFixed(3)}`);
  });
  lines.push('----------------------');
  lines.push(`TOTAL: ${parseFloat(order.total).toFixed(3)}`);
  lines.push(`PAID: ${parseFloat(order.paid_amount).toFixed(3)}`);
  lines.push(`CHANGE: ${parseFloat(order.change_amount).toFixed(3)}`);
  lines.push('----------------------');
  lines.push('Merci!');
  return lines.join('\n');
}

module.exports = { buildReceipt };
