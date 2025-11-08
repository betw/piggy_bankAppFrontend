# API Specification: ProgressTracking Concept

**Purpose:** create and track savings plans for discretionary vacation goals

***

## API Endpoints

### POST /api/ProgressTracking/createPlan

**Description:** Creates a new savings plan for a user, linked to a specific trip.

**Requirements:**

*   amountPerPeriod is a >= 0 amount that the user selects to pay every paymentPeriod month, and goalAmount is >= 0

**Effects:**

*   makes a new plan linked to `trip` and `user`. Sets `currentAmount` to `0`. Sets `goalReachedFlag` to `false`

**Request Body:**

```json
{
  "session": "Session",
  "trip": "TripCostEstimation",
  "paymentPeriod": "Number",
  "amountPerPeriod": "Number",
  "goalAmount": "Number"
}
```

**Success Response Body (Action):**

```json
{
  "plan": "Plan",
  "paymentPeriod": "Number",
  "amountPerPeriod": "Number"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/ProgressTracking/addAmount

**Description:** Adds a specified amount to a user's savings plan and updates the goal status.

**Requirements:**

*   plan exists and belongs to the user associated with the session

**Effects:**

*   increases `currentAmount` of plan by `amount` and then calls `updateGoalStatus(user, plan)`.

**Request Body:**

```json
{
  "session": "Session",
  "plan": "Plan",
  "amount": "Number"
}
```

**Success Response Body (Action):**

```json
{
  "currentAmount": "Number"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/ProgressTracking/removeAmount

**Description:** Decreases the current amount in a savings plan and updates the goal status.

**Requirements:**

*   plan exists and belongs to the user associated with the session and amount less than or equal to currentAmount associated with plan

**Effects:**

*   decreases `currentAmount` by `amount` and then calls `updateGoalStatus(user, plan)`.

**Request Body:**

```json
{
  "session": "Session",
  "plan": "Plan",
  "amount": "Number"
}
```

**Success Response Body (Action):**

```json
{
  "currentAmount": "Number"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/ProgressTracking/deletePlan

**Description:** Removes a user's specified savings plan.

**Requirements:**

*   `plan` exists and belongs to the user associated with the session

**Effects:**

*   removes plan

**Request Body:**

```json
{
  "session": "Session",
  "plan": "Plan"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/ProgressTracking/modifyPlan

**Description:** Updates the payment period and amount per period for an existing savings plan.

**Requirements:**

*   plan exists and belongs to the user associated with the session

**Effects:**

*   updates savings schedule associated with plan by changing the `paymentPeriod` to `newPaymentPeriod` and `amountPerPeriod` to `newAmountPerPeriod`.

**Request Body:**

```json
{
  "session": "Session",
  "plan": "Plan",
  "newPaymentPeriod": "Number",
  "newAmountPerPeriod": "Number"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/ProgressTracking/updateGoalStatus

**Description:** Updates the goal-reached flag for a plan based on its current and goal amounts.

**Requirements:**

*   `plan` exists and belongs to the user associated with the `session`.

**Effects:**

*   If `plan.currentAmount >= plan.goalAmount`, sets `plan.goalReachedFlag` to `true`.
*   Otherwise (`plan.currentAmount < plan.goalAmount`), sets `plan.goalReachedFlag` to `false`.

**Request Body:**

```json
{
  "session": "Session",
  "plan": "Plan"
}
```

**Success Response Body (Action):**

```json
{
  "goalReachedFlag": "Boolean"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/ProgressTracking/_getPlans

**Description:** Returns an array of all existing savings plans belonging to a user.

**Requirements:**

*   None specified.

**Effects:**

*   returns an array of all existing Plans belonging to the user associated with the session

**Request Body:**

```json
{
  "session": "Session"
}
```

**Success Response Body (Query):**

```json
[
  {
    "plan": "Plan"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***
