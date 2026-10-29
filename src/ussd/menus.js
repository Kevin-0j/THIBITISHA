const openShift = require('./flows/openShift');
const roomCash = require('./flows/roomCash');
const barTab = require('./flows/barTab');
const shiftLiability = require('./flows/shiftLiability');
const closeShift = require('./flows/closeShift');
const roomsUsed = require('./flows/roomsUsed');
const ownerLiability = require('./flows/ownerLiability');
const ownerToday = require('./flows/ownerToday');
const payerSummary = require('./flows/payerSummary');
const confirmPayment = require('./flows/confirmPayment');
const myReceipts = require('./flows/myReceipts');
const config = require('../config');

// Who sees what. Option numbers are the position in the list (1-based), so to add a menu item,
// write a flow file and put it in the right list here.
function menuFor({ staff, venue, shift }) {
  switch (staff.role) {
    case 'manager':
    case 'bartender':
      return shift
        ? { title: `Welcome to ${venue.name}`, flows: [roomCash, barTab, shiftLiability, closeShift] }
        : { title: `Welcome to ${venue.name}\nNo open shift.`, flows: [openShift] };
    case 'housekeeper':
      return { title: venue.name, flows: [roomsUsed] };
    case 'owner':
      return { title: `${venue.name} (owner)`, flows: [ownerLiability, ownerToday, payerSummary] };
    case 'payer':
      return { title: config.brandName, flows: [confirmPayment, myReceipts] };
    default:
      return { title: venue.name, flows: [] };
  }
}

module.exports = { menuFor };
