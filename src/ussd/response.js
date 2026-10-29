const config = require('../config');

// Africa's Talking reads the first four characters: "CON " keeps the session open, "END " closes it.
function build(prefix, lines) {
  const body = Array.isArray(lines) ? lines.join('\n') : String(lines);
  const out = `${prefix} ${body}`;
  if (out.length > config.ussd.maxScreenChars) {
    console.warn(`[ussd] screen is ${out.length} chars (limit ${config.ussd.maxScreenChars}), handsets will truncate it:\n${out}`);
  }
  return out;
}

const con = (lines) => build('CON', lines);
const end = (lines) => build('END', lines);

// 4500 -> "4,500". Done by hand so output never depends on the server's locale data.
function formatKes(amount) {
  return String(Math.round(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

module.exports = { con, end, formatKes };
