# API Specification: Notification Concept

**Purpose:** remind users to save and celebrate milestones

---

## API Endpoints

### POST /api/Notification/createNotification

**Description:** Creates a new notification with the specified user, progress tracking, frequency, and message.

**Requirements:**
- None specified.

**Effects:**
- create and return a notification with the above input details

**Request Body:**
```json
{
  "session": "Session",
  "progress": "ProgressTracking",
  "frequency": "Number",
  "message": "String"
}
```

**Success Response Body (Action):**
```json
{
  "notification": "Notification"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/Notification/deleteNotification

**Description:** Deletes a specific notification belonging to a user.

**Requirements:**
- notification exists and belongs to the user associated with the session

**Effects:**
- deletes the notification

**Request Body:**
```json
{
  "session": "Session",
  "notification": "Notification"
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

---

### POST /api/Notification/\_getAllNotifications

**Description:** Returns a list of all notifications belonging to the specified user, sorted by date.

**Requirements:**
- session is valid

**Effects:**
- returns a list of all notifications belonging to the user associated with the session sorted by the date

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
    "notification": "Notification"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/Notification/getNotificationMessageAndFreq

**Description:** Retrieves the message and frequency for a notification belonging to the specified user.

**Requirements:**
- notification exists and belongs to the user associated with the session

**Effects:**
- returns the message and frequency of the specified notification

**Request Body:**
```json
{
  "session": "Session",
  "notification": "Notification"
}
```

**Success Response Body (Query):**
```json
{
  "message": "String",
  "frequency": "Number"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
