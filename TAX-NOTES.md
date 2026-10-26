# DashTracker tax model and research

Rules checked October 26, 2026. This is a planning estimate for a single, independent New York resident under 65, dashing locally around Williamsville in Erie County, with annual adjusted gross income up to $50,000. It is not a full tax-return calculator or a guaranteed amount due.

## Cash earnings

- Gross DoorDash earnings = Dash pay before tips + customer tips.
- Total shift hours = entered hours + entered minutes / 60. Use the whole shift, including waiting, driving, pickup, and drop-off.
- DoorDash vehicle cost = each dated gas or maintenance purchase × its entered DoorDash-use percentage.
- Cash profit = gross earnings − DoorDash vehicle costs paid during the selected reporting period.
- Real hourly rate = cash profit / total shift hours. Mileage deductions are not subtracted from cash profit.
- Gas and maintenance entries are independent of shifts. On shift rows, period expenses are allocated in proportion to business miles, falling back to time if no miles exist in the period. Therefore a shift's allocated net rate may change between weekly, monthly, and yearly views.

## 2026 tax estimate

Tax estimates always use the full selected calendar year's recorded shifts, even when the earnings view shows only a week or month. They do not project unrecorded future shifts. Do not treat a partial year of entries as your final year's tax bill.

1. Eligible Stride business mileage is multiplied by the rate for the shift date: **72.5¢/mile from January 1 to June 30, 2026; 76¢/mile from July 1 to December 31, 2026**. Only qualifying business miles should be entered. Keep Stride's underlying mileage log.
2. Tax business profit = gross DoorDash earnings minus mileage deduction, floored at zero in this conservative planning model. Gas and maintenance are not deducted again. Business loss offsets and loss carryforwards are not modeled.
3. Self-employment tax uses 92.35% of tax business profit. If those net earnings are at least $400, the model applies 15.3%. Social Security wage-cap coordination and Additional Medicare Tax are outside the app's under-$50,000 scope.
4. Half of self-employment tax reduces income for federal and NY income taxes.
5. Eligible qualified tips can be deducted up to the lower of recorded qualifying tips, $25,000, or business profit after the deductible half of SE tax. Other allocable deductions would also affect that limit but are not modeled. The federal deduction applies for 2025–2028 under current law, phases out above $150,000 MAGI for single filers, requires qualifying work and a valid SSN, and has reporting requirements. This app only estimates within the under-$50,000 scope, below that phaseout. For 2026, keep the platform's separately reported tip amounts and reconcile them with tax forms. Mandatory service charges are not voluntary tips. Tips remain subject to SE tax.
6. New York's enacted FY2027 budget, Part B of S9009C (Chapter 59, signed May 28, 2026), allows a subtraction beginning in tax year 2026 of up to $25,000 to the extent allowed under federal IRC §224. The model uses the same eligible amount as the federal tips deduction.
7. Federal standard deduction: $16,100 for a single independent filer in 2026. Federal income-tax rates within the app's scope: 10% on the first $12,400 of taxable income, then 12% through $50,400.
8. The optional federal QBI model excludes deducted tips and the deductible half of SE tax from QBI. It uses the lower of 20% of QBI or 20% of pre-QBI taxable income, with the new 2026 $400 minimum for at least $1,000 of active QBI, limited here to remaining taxable income. It assumes material participation in this one business. Disable it if you do not qualify. Carryforward losses and other businesses are not modeled.
9. NY standard deduction: $8,000 for a single filer who cannot be claimed as a dependent. Within the app's income scope, the 2026 progressive rates are 3.90% through $8,500, 4.40% through $11,700, 5.15% through $13,900, and 5.40% above that through $80,650. The app uses continuous bracket math for estimates, so filing-table rounding may differ slightly.
10. Other annual ordinary income defaults to $0. Federal and NY income taxes attributable to DoorDash are computed as the tax with the business income minus the tax on that other-income baseline. SE tax is then added. The app does not estimate the remaining balance on unrelated income.
11. Entered federal payments reduce federal + SE tax reserve; entered NY payments reduce the NY reserve. They do not change the estimated tax expense used for after-tax hourly earnings.
12. After-tax hourly earnings for a selected period allocate the year's estimated DoorDash tax in proportion to that period's share of annual gross DoorDash earnings, then subtract it from cash profit and divide by total shift hours. This is a budgeting allocation, not an IRS tax calculation per shift. For a week spanning years without all applicable rules, the after-tax estimate is withheld.

## Location and exclusions

No NYC resident income tax, Yonkers tax, or Metropolitan Commuter Transportation Mobility Tax is included for local Erie County driving. MCTMT geography is based on where business is performed; update the model if you start doing business in the metropolitan district.

Tax credits (including federal/NY earned income credits and NY household credits), age-specific deductions, dependents, itemized deductions, self-employed health insurance, retirement deductions, capital gains, other business losses, and other special return items are excluded. These can change the amount owed. This model is a pre-credit reserve estimate and may overstate final tax, particularly at lower incomes. The app does not calculate estimated-payment penalties or safe-harbor requirements.

## 2027 and beyond

You can enter and report dated shifts and expenses for 2026 onward. Only **2026 tax rules** have been verified and enabled. For later years, mileage is retained but tax deduction/after-tax estimates are shown as pending until verified rates and rules are added in `src/domain.ts`. Future IRS inflation adjustments should not be guessed. Tips relief is currently temporary through 2028.

## Primary sources

- IRS standard mileage rates: https://www.irs.gov/tax-professionals/standard-mileage-rates
- IRS Announcement 2026-11, midyear mileage change: https://www.irs.gov/irb/2026-29_irb
- IRS 2026 Publication 505, standard deduction and brackets: https://www.irs.gov/publications/p505
- IRS SE tax guidance: https://www.irs.gov/businesses/small-businesses-self-employed/self-employment-tax-social-security-and-medicare-taxes
- IRS tips deduction overview: https://www.irs.gov/newsroom/what-the-no-tax-on-tips-deduction-means-for-you
- IRS 1040 instructions, Schedule 1-A net-income limitation and reporting: https://www.irs.gov/instructions/i1040gi
- IRS QBI rules: https://www.irs.gov/instructions/i8995
- IRS 2026 active-business minimum: https://www.irs.gov/newsroom/qualified-business-income-deduction
- IRS inflation guidance discussing the new QBI minimum: https://www.irs.gov/pub/irs-drop/rp-25-32.pdf
- NY 2026 estimated-tax instructions, deductions, rates, and MCTMT geography: https://www.tax.ny.gov/pdf/current_forms/it/it2105i.pdf
- Enacted NY budget, S9009C, Part B: https://www.nysenate.gov/legislation/bills/2025/S9009/amendment/C
- NY governor's signed-budget summary: https://www.governor.ny.gov/news/governor-hochul-signs-budget-makes-new-york-more-affordable-keeps-new-yorkers-safe-and-expands
- IRS Publication 463, standard mileage versus actual vehicle costs: https://www.irs.gov/publications/p463
