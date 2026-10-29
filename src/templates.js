// The same engine serves different kinds of business. A template only changes wording, the
// reporting period the owner sees, and whether payers get an airtime reward by default.
const TEMPLATES = {
  lodge: { place: 'room', collector: 'manager', period: 'day', defaultRewardKes: 10 },
  rent: { place: 'unit', collector: 'caretaker', period: 'month', defaultRewardKes: 0 },
};

function templateFor(venue) {
  return TEMPLATES[venue && venue.template] || TEMPLATES.lodge;
}

module.exports = { TEMPLATES, templateFor };
