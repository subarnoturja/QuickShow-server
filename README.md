# QuickShow - movie ticket booking website

QuickShow is a full-stack movie ticket booking website that lets users easily browse movies, securely reserve theater seats, and enjoy the ultimate cinema experience—all in one place.

**Live Demo**: https://quick-show-client-ruby.vercel.app/

**Frontend Repository**: https://github.com/subarnoturja/QuickShow-client

## 🚀 Features

- Live synchronization of content changes
- Intuitive design for easy navigation
- Optimized for quick loading and smooth interactions
- Clean and professional interface
- Secure Authentication with clerk

## 📋 Prerequisites
Before running this project, ensure you have:
- Node.js (v16 or higher)
- MongoDB (local installation or MongoDB Atlas)
- npm or yarn package manager
## 🛠️ Tech Stack

**Server:** Node.js, Express.js, MongoDB, Axios, Nodemailer
## 🔧 Installation

- Clone the repository:

``` bash
git clone https://github.com/subarnoturja/QuickShow-server
cd quickshow-backend
```

- Install dependencies:

```bash
npm install
# or
yarn install
```

- Create a `.env` file in the root directory:

```bash
# Server Configuration
PORT=5000
NODE_ENV=development
```

``` bash
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/quickshow
```

``` bash
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

## 🚀 Running the Application
**Development Mode**
``` bash
npm run dev
# or
yarn dev
```

The server will start at http://localhost:3000