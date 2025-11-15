# Exam Portal

A comprehensive examination management system built with HTML, CSS, JavaScript frontend, PHP backend, and MySQL database.

## Features

### For Students
- **User Registration & Authentication**: Secure login with role-based access
- **Dashboard**: View upcoming exams, available exams, and results overview
- **Exam Taking**: Interactive interface with timer, question navigation, and auto-save
- **Profile Management**: Edit personal information and change password
- **Results Viewing**: Detailed performance analysis with question-wise breakdown
- **Certificates**: Download certificates for passed exams

### For Administrators
- **Admin Dashboard**: System overview with statistics and recent activity
- **User Management**: Add, edit, and remove user accounts
- **Exam Management**: Create, schedule, and manage examinations
- **Results Management**: View all results with filtering and export options
- **Reports**: Generate CSV reports for users, exams, and results

## Installation

### Prerequisites
- PHP 8.0+ with extensions: mysqli, curl, json, gd
- MySQL 8.0+ or MariaDB 10.5+
- Apache 2.4+ or Nginx 1.18+

### Setup Instructions

1. **Database Setup**
   ```bash
   mysql -u root -p
   CREATE DATABASE exam_portal;
   ```

2. **Import Schema**
   ```bash
   mysql -u root -p exam_portal < database/schema.sql
   ```

3. **Configure Database Connection**
   Edit `config/database.php`:
   ```php
   private $host = 'localhost';
   private $db_name = 'exam_portal';
   private $username = 'root';
   private $password = 'your_password';
   ```

4. **File Permissions**
   ```bash
   chmod -R 755 .
   chmod -R 777 uploads/
   ```

5. **Web Server Configuration**
   Place files in web root and configure virtual host.

## Default Accounts

After importing the database, you can use these accounts:

### Administrator
- **Username**: admin
- **Password**: admin123
- **Email**: admin@examportal.com

### Students
- **Username**: student1
- **Password**: student123
- **Email**: student1@example.com

- **Username**: student2
- **Password**: student123
- **Email**: student2@example.com

## File Structure

```
Quizportal/
├── index.html                 # Login/Registration page
├── dashboard.html              # Student dashboard
├── admin-dashboard.html         # Admin dashboard
├── profile.html               # Profile management
├── exam.html                 # Exam taking interface
├── results.html               # Results viewing
├── css/
│   └── style.css             # Main stylesheet
├── js/
│   ├── auth.js              # Authentication logic
│   ├── dashboard.js         # Student dashboard
│   ├── admin.js             # Admin dashboard
│   ├── profile.js           # Profile management
│   ├── exam.js              # Exam taking
│   └── results.js           # Results viewing
├── config/
│   ├── config.php           # Application configuration
│   └── database.php         # Database connection
├── includes/
│   └── session.php          # Session management
├── api/                     # API endpoints
└── database/
    └── schema.sql          # Database schema
```

## Security Features

- **Password Security**: Bcrypt hashing with cost factor 12
- **Session Management**: Secure cookies with HttpOnly, Secure flags
- **CSRF Protection**: Token-based CSRF prevention
- **SQL Injection**: Prepared statements for all queries
- **XSS Protection**: Output escaping and input sanitization
- **Rate Limiting**: Login attempt limits
- **File Upload Security**: Type and size validation

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Responsive Design

The system is fully responsive and works on:
- Desktop computers
- Laptops
- Tablets
- Mobile phones

---

**Note**: This is a complete implementation of an examination management system as requested. All major features have been implemented with proper security measures and responsive design.