# Environment Setup Instructions

## API Configuration

To connect the frontend to the backend API, you need to create a `.env.local` file in the `frontend` directory with the following content:

```env
# API Configuration
# This file contains environment variables for local development
# 
# IMPORTANT: 
# - Variables prefixed with NEXT_PUBLIC_ are exposed to the browser
# - Never commit sensitive data (API keys, secrets) to version control
# - For production, set these in your hosting platform's environment variables

# Backend API Base URL
# Change this if your backend runs on a different port or domain
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1

# Example for production:
# NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1
```

## Steps to Set Up

1. Create a file named `.env.local` in the `frontend` directory
2. Copy the content above into the file
3. Adjust the `NEXT_PUBLIC_API_URL` if your backend runs on a different port
4. Restart your Next.js development server for changes to take effect

## Notes

- The `.env.local` file is automatically ignored by git (should be in `.gitignore`)
- If the backend is running on a different port, update the URL accordingly
- For production deployments, set the environment variable in your hosting platform's settings

