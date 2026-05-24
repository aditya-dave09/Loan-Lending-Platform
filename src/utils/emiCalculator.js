/**
 * EMI (Equated Monthly Installment) calculator.
 * Generates a complete repayment schedule for a loan.
 */

/**
 * Calculate EMI amount using the standard formula:
 * EMI = P × r × (1 + r)^n / ((1 + r)^n - 1)
 *
 * @param {number} principal - Loan amount
 * @param {number} annualRate - Annual interest rate (percentage, e.g., 8.5)
 * @param {number} tenureMonths - Loan tenure in months
 * @returns {number} Monthly EMI amount (rounded to 2 decimals)
 */
function calculateEMI(principal, annualRate, tenureMonths) {
  // If interest rate is 0, simple division
  if (annualRate === 0) {
    return parseFloat((principal / tenureMonths).toFixed(2));
  }

  const monthlyRate = annualRate / 100 / 12;
  const factor = Math.pow(1 + monthlyRate, tenureMonths);
  const emi = (principal * monthlyRate * factor) / (factor - 1);
  return parseFloat(emi.toFixed(2));
}

/**
 * Generate a complete repayment schedule.
 *
 * @param {number} principal - Loan amount
 * @param {number} annualRate - Annual interest rate (percentage)
 * @param {number} tenureMonths - Loan tenure in months
 * @param {Date} startDate - When the first EMI is due
 * @returns {{ schedule: Array, totalRepayable: number }}
 */
function generateRepaymentSchedule(principal, annualRate, tenureMonths, startDate) {
  const emi = calculateEMI(principal, annualRate, tenureMonths);
  const monthlyRate = annualRate / 100 / 12;
  let remainingPrincipal = principal;
  const schedule = [];

  for (let i = 1; i <= tenureMonths; i++) {
    const interestPortion = parseFloat((remainingPrincipal * monthlyRate).toFixed(2));
    let principalPortion = parseFloat((emi - interestPortion).toFixed(2));

    // Adjust the last installment to account for rounding
    if (i === tenureMonths) {
      principalPortion = parseFloat(remainingPrincipal.toFixed(2));
    }

    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i);

    schedule.push({
      installmentNumber: i,
      amountDue: i === tenureMonths ? parseFloat((principalPortion + interestPortion).toFixed(2)) : emi,
      principalPortion,
      interestPortion,
      dueDate,
    });

    remainingPrincipal -= principalPortion;
  }

  const totalRepayable = schedule.reduce((sum, item) => sum + item.amountDue, 0);

  return {
    schedule,
    totalRepayable: parseFloat(totalRepayable.toFixed(2)),
  };
}

module.exports = {
  calculateEMI,
  generateRepaymentSchedule,
};
