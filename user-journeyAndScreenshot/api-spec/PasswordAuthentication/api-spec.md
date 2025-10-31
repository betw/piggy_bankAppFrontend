# API Specification: PasswordAuthentication Concept

**Purpose:** limit access to verified users

---

## API Endpoints

### POST /api/PasswordAuthentication/register

**Description:** Registers a new user with a unique username and a password.

**Requirements:**
- `username` not in **Users**
- length of username and password >= 8

**Effects:**
- adds username and password and associates it with User user

**Request Body:**
```json
{
  "username": "String",
  "password": "String"
}
```

**Success Response Body (Action):**
```json
{
  "user": "User"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/PasswordAuthentication/authenticate

**Description:** Authenticates an existing user by verifying their username and password.

**Requirements:**
- username exists

**Effects:**
- returns the user if `password` matches the one associated with username, otherwise Error

**Request Body:**
```json
{
  "username": "String",
  "password": "String"
}
```

**Success Response Body (Action):**
```json
{
  "user": "User"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/PasswordAuthentication/_getAllUsers

**Description:** Retrieves a list of all registered users.

**Requirements:**
- None specified.

**Effects:**
- Returns a list of all registered users.

**Request Body:**
```json
{}
```

**Success Response Body (Query):**
```json
[
  {
    "user": "User"
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

### POST /api/PasswordAuthentication/_getUserUsername

**Description:** Retrieves the username associated with a specific user ID.

**Requirements:**
- user exists

**Effects:**
- Returns the username associated with the specified `user`.

**Request Body:**
```json
{
  "user": "User"
}
```

**Success Response Body (Query):**
```json
[
  {
    "username": "String"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```