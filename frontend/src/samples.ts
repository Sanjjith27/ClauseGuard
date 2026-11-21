/*
 * ClauseGuard demo contracts. Kept out of App.tsx so the component file has
 * a single, HMR-friendly export. The `text` and `name` fields are mirrored in
 * backend/app/clauses.py so the parity harness covers every sample.
 */

export const sampleContracts = {
  gym: {
    label: "Gym Membership Trap",
    subtitle: "$199 Fee + 60-Day Trap",
    name: "Apex Fitness Club Membership Agreement",
    text: `Apex Fitness Club Membership Agreement (Effective Date: January 1, 2024)

1. MEMBERSHIP TERMS
This agreement constitutes the entire understanding between the Member and Apex Fitness Club regarding the use of facility amenities. Membership is offered on a monthly basis and will automatically renew for successive 12-month periods unless terminated in accordance with Section 7.

2. ANNUAL FACILITY MAINTENANCE FEE
A non-refundable annual facility maintenance fee of $199.00 will be charged each membership year, due on the anniversary of the Effective Date. This fee is mandatory and will be automatically billed to the payment method on file.

3. AUTOMATIC RENEWAL CLAUSE
This membership will automatically renew for a successive 12-month period. The Member must provide written notice via certified mail to Apex Fitness Club, 222 Health Street, Fitness City, at least 60 days prior to the expiration date to avoid automatic renewal. Failure to provide timely notice constitutes acceptance of renewal terms.

4. EARLY TERMINATION PENALTY
If the Member terminates this agreement before the completion of the 12-month term, a non-refundable early termination penalty of $250.00 will be charged. The Member remains liable for all unpaid fees through the date of termination.

5. PAYMENT AND BILLING
Monthly membership dues of $49.99 will be auto-charged to the payment method on file. The Member authorizes Apex Fitness Club to charge the payment method on file for all applicable fees.

6. FACILITY RULES AND REGULATIONS
Members must adhere to all posted facility rules and code of conduct. Apex Fitness Club reserves the right to suspend or terminate membership for violation of rules.

7. NOTICE REQUIREMENTS
All cancellation notices must be sent via certified mail to the address in Section 3. Email or verbal notice will not be accepted as valid cancellation notice. The 60-day notice period is strictly enforced.`,
  },
  trial: {
    label: "SaaS Auto-Renewal",
    subtitle: "$240/yr Silent Conversion",
    name: "CloudSync Pro Enterprise Trial Terms",
    text: `CloudSync Pro Enterprise Trial Terms (Effective Date: March 1, 2024)

1. TRIAL PERIOD
New customers are eligible for a 7-day free trial beginning on the date of account creation. The trial provides full access to all Enterprise features at no cost.

2. AUTOMATIC SUBSCRIPTION CONVERSION
At the end of the 7-day free trial, the account will automatically convert to a $240/year non-refundable subscription unless the customer cancels at least 72 hours before trial expiration. The customer authorizes automatic billing upon conversion.

3. UNILATERAL PRICE INCREASE CLAUSE
CloudSync Pro reserves the right to increase subscription prices upon renewal. Customers will receive written notice at least 30 days before any price change takes effect. Continued use of the service after the notice date constitutes acceptance of the new pricing.

4. FEATURE ACCESS AND LIMITS
During the trial and subscription period, customers have access to all Enterprise features subject to fair usage limits. CloudSync Pro may modify or discontinue features at its discretion.

5. AUTOMATIC RENEWAL AND BILLING
The $240/year subscription will automatically renew for successive annual periods. Payment will be charged to the payment method on file. Customers must cancel before the renewal date to avoid automatic renewal.

6. SERVICE TERMINATION
CloudSync Pro may terminate this agreement at any time for violation of terms. Customers may request termination with 30 days written notice.

7. GOVERNING LAW
This agreement shall be governed by the laws of the State of California. All disputes shall be resolved in the federal courts of Northern California.`,
  },
  lease: {
    label: "Student Lease Trap",
    subtitle: "$350 Deposit Deduction",
    name: "Oakridge Student Lofts Lease Addendum",
    text: `Oakridge Student Lofts Lease Addendum (Effective Date: September 1, 2024)

1. ADDITIONAL DEPOSIT DEDUCTIONS
In addition to the standard security deposit, tenants must pay a mandatory $350 carpet cleaning and repainting fee. This fee will be deducted from the security deposit at the end of the lease term regardless of actual wear and tear condition.

2. UNILATERAL ENTRY WAIVER
Tenants waive their right to 24-hour advance notice for landlord entry. Landlord may enter the premises at any time for "inspection purposes" without prior tenant consent or scheduling.

3. AUTOMATIC RENEWAL AND RENT INCREASE
This lease agreement will automatically renew for a 12-month period at the end of the initial term. Rent will increase by 5% upon renewal without further negotiation.

4. PET POLICY AND DEPOSITS
All pets require prior written approval and a non-refundable pet fee of $300. Pet deposits are not refundable under any circumstances.

5. LATE PAYMENT PENALTIES
Rent payments received after the 1st of the month incur a late fee of $50 or 5% of the monthly rent, whichever is greater. Late fees are automatically added to the next month's balance.

6. SECURITY DEPOSIT FORFEITURE
The security deposit of $1,000 may be fully retained by Oakridge Student Lofts for any alleged damage, normal wear and tear included. Tenants have limited recourse to dispute deductions.

7. NOTICE AND TERMINATION
Tenants must provide 60 days written notice before lease expiration. Failure to provide proper notice results in automatic conversion to month-to-month tenancy at the increased rate.`,
  },
  freelance: {
    label: "Fair Freelance Contract",
    subtitle: "Clean terms - No traps",
    name: "Northstar Freelance Services Agreement",
    text: `Northstar Freelance Services Agreement (Effective Date: June 1, 2024)

1. SCOPE OF WORK
The Designer will deliver a brand identity package consisting of a logo, style guide, and editable source files. Deliverables and acceptance criteria are listed in Exhibit A and signed by both parties.

2. PAYMENT TERMS
Client will pay a fixed project fee of $2,500 within 30 days of receipt of an invoice. No subscription, recurring charge, or auto-pay arrangement applies to this engagement.

3. ENDING THE ENGAGEMENT
Either party may end this engagement after giving two weeks advance notification. Client will pay for all completed and accepted work, and the Designer will return any unused deposit within 10 business days.

4. CHANGES AND APPROVALS
Any change to scope requires a written change order signed by both parties before work begins. Fees for additional work are agreed in writing in advance.

5. INTELLECTUAL PROPERTY
Upon full payment, all final deliverables are assigned to Client. The Designer retains ownership of draft concepts and may display the finished work in a portfolio with Client's written permission.

6. DISPUTE RESOLUTION
The parties will first attempt to resolve disagreements through good-faith discussion. If unresolved, both parties consent to mediation in Austin, Texas before any legal action.

7. APPLICABLE LAW
This engagement is governed by the laws of the State of Texas.`,
  },
};

export type SampleKey = keyof typeof sampleContracts;
