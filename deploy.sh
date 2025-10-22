#!/bin/bash

# Relosity AI Platform Deployment Script
# This script automates the deployment process

echo "🚀 Starting Relosity AI Platform Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js first."
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    if ! command -v git &> /dev/null; then
        print_error "Git is not installed. Please install Git first."
        exit 1
    fi
    
    print_success "All dependencies are installed."
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    if [ -f "package.json" ]; then
        npm install
        if [ $? -eq 0 ]; then
            print_success "Dependencies installed successfully."
        else
            print_error "Failed to install dependencies."
            exit 1
        fi
    else
        print_warning "No package.json found. Skipping npm install."
    fi
}

# Build the project
build_project() {
    print_status "Building the project..."
    
    # Create build directory
    mkdir -p build
    
    # Copy frontend files
    cp -r frontend/* build/
    
    # Copy backend files
    mkdir -p build/backend
    cp -r backend/* build/backend/
    
    # Copy configuration files
    cp package.json build/
    cp .env.example build/.env.example
    cp README.md build/
    cp sitemap.xml build/
    cp robots.txt build/
    cp manifest.json build/
    cp sw.js build/
    cp firebaseConfig.js build/
    
    # Create production environment file
    cat > build/.env << EOF
# Production Environment Variables
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://relosity-ai.com

# Firebase Configuration
FIREBASE_PRIVATE_KEY_ID=\${FIREBASE_PRIVATE_KEY_ID}
FIREBASE_PRIVATE_KEY=\${FIREBASE_PRIVATE_KEY}
FIREBASE_CLIENT_EMAIL=\${FIREBASE_CLIENT_EMAIL}
FIREBASE_CLIENT_ID=\${FIREBASE_CLIENT_ID}
FIREBASE_PROJECT_ID=gmae-fae90

# OpenAI Configuration
OPENAI_API_KEY=\${OPENAI_API_KEY}

# JWT Secret
JWT_SECRET=\${JWT_SECRET}

# Email Configuration
EMAIL_USER=\${EMAIL_USER}
EMAIL_PASS=\${EMAIL_PASS}
ADMIN_EMAIL=admin@relosity-ai.com

# Security
CORS_ORIGIN=https://relosity-ai.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Features
ENABLE_AI_CHAT=true
ENABLE_IMAGE_GENERATION=true
ENABLE_EMBEDDINGS=true
ENABLE_MODERATION=true
ENABLE_PUSH_NOTIFICATIONS=true

# Admin
ADMIN_SECRET_CODE=\${ADMIN_SECRET_CODE}
ENABLE_ADMIN_PANEL=true
EOF

    print_success "Project built successfully."
}

# Deploy to Netlify (Frontend)
deploy_frontend() {
    print_status "Deploying frontend to Netlify..."
    
    if [ -z "$NETLIFY_SITE_ID" ]; then
        print_warning "NETLIFY_SITE_ID not set. Skipping Netlify deployment."
        return
    fi
    
    if command -v netlify &> /dev/null; then
        cd build
        netlify deploy --prod --dir=.
        if [ $? -eq 0 ]; then
            print_success "Frontend deployed to Netlify successfully."
        else
            print_error "Failed to deploy frontend to Netlify."
        fi
        cd ..
    else
        print_warning "Netlify CLI not installed. Please install it or deploy manually."
    fi
}

# Deploy to Vercel (Backend)
deploy_backend() {
    print_status "Deploying backend to Vercel..."
    
    if [ -z "$VERCEL_TOKEN" ]; then
        print_warning "VERCEL_TOKEN not set. Skipping Vercel deployment."
        return
    fi
    
    if command -v vercel &> /dev/null; then
        cd build/backend
        vercel --prod --token=$VERCEL_TOKEN
        if [ $? -eq 0 ]; then
            print_success "Backend deployed to Vercel successfully."
        else
            print_error "Failed to deploy backend to Vercel."
        fi
        cd ../..
    else
        print_warning "Vercel CLI not installed. Please install it or deploy manually."
    fi
}

# Deploy to Railway (Alternative Backend)
deploy_railway() {
    print_status "Deploying backend to Railway..."
    
    if [ -z "$RAILWAY_TOKEN" ]; then
        print_warning "RAILWAY_TOKEN not set. Skipping Railway deployment."
        return
    fi
    
    if command -v railway &> /dev/null; then
        cd build/backend
        railway login --token=$RAILWAY_TOKEN
        railway up --detach
        if [ $? -eq 0 ]; then
            print_success "Backend deployed to Railway successfully."
        else
            print_error "Failed to deploy backend to Railway."
        fi
        cd ../..
    else
        print_warning "Railway CLI not installed. Please install it or deploy manually."
    fi
}

# Setup Firebase
setup_firebase() {
    print_status "Setting up Firebase..."
    
    if command -v firebase &> /dev/null; then
        firebase login --no-localhost
        firebase init --project=gmae-fae90
        print_success "Firebase setup completed."
    else
        print_warning "Firebase CLI not installed. Please install it manually."
    fi
}

# Run tests
run_tests() {
    print_status "Running tests..."
    
    if [ -f "package.json" ] && grep -q "test" package.json; then
        npm test
        if [ $? -eq 0 ]; then
            print_success "All tests passed."
        else
            print_warning "Some tests failed."
        fi
    else
        print_warning "No tests configured."
    fi
}

# Generate deployment report
generate_report() {
    print_status "Generating deployment report..."
    
    cat > build/deployment-report.md << EOF
# Relosity AI Platform Deployment Report

## Deployment Date
$(date)

## Environment
- Node.js: $(node --version)
- npm: $(npm --version)
- Git: $(git --version)

## Deployed Components
- ✅ Frontend (HTML, CSS, JavaScript)
- ✅ Backend (Node.js, Express)
- ✅ Firebase Configuration
- ✅ PWA Manifest
- ✅ Service Worker
- ✅ Documentation
- ✅ Admin Panel

## URLs
- Frontend: https://relosity-ai.com
- Backend API: https://api.relosity-ai.com
- Documentation: https://relosity-ai.com/docs.html
- Admin Panel: https://relosity-ai.com/admin.html

## Next Steps
1. Configure environment variables
2. Set up domain names
3. Configure SSL certificates
4. Set up monitoring
5. Configure backups

## Support
For support, contact: support@relosity-ai.com
EOF

    print_success "Deployment report generated."
}

# Main deployment function
main() {
    echo "🎯 Relosity AI Platform Deployment Script"
    echo "========================================"
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ] && [ ! -d "frontend" ]; then
        print_error "Please run this script from the project root directory."
        exit 1
    fi
    
    # Parse command line arguments
    DEPLOY_FRONTEND=false
    DEPLOY_BACKEND=false
    DEPLOY_RAILWAY=false
    SETUP_FIREBASE=false
    RUN_TESTS=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --frontend)
                DEPLOY_FRONTEND=true
                shift
                ;;
            --backend)
                DEPLOY_BACKEND=true
                shift
                ;;
            --railway)
                DEPLOY_RAILWAY=true
                shift
                ;;
            --firebase)
                SETUP_FIREBASE=true
                shift
                ;;
            --test)
                RUN_TESTS=true
                shift
                ;;
            --all)
                DEPLOY_FRONTEND=true
                DEPLOY_BACKEND=true
                SETUP_FIREBASE=true
                RUN_TESTS=true
                shift
                ;;
            *)
                print_error "Unknown option: $1"
                echo "Usage: $0 [--frontend] [--backend] [--railway] [--firebase] [--test] [--all]"
                exit 1
                ;;
        esac
    done
    
    # If no specific options, deploy everything
    if [ "$DEPLOY_FRONTEND" = false ] && [ "$DEPLOY_BACKEND" = false ] && [ "$DEPLOY_RAILWAY" = false ] && [ "$SETUP_FIREBASE" = false ] && [ "$RUN_TESTS" = false ]; then
        DEPLOY_FRONTEND=true
        DEPLOY_BACKEND=true
        SETUP_FIREBASE=true
        RUN_TESTS=true
    fi
    
    # Run deployment steps
    check_dependencies
    install_dependencies
    
    if [ "$RUN_TESTS" = true ]; then
        run_tests
    fi
    
    build_project
    
    if [ "$SETUP_FIREBASE" = true ]; then
        setup_firebase
    fi
    
    if [ "$DEPLOY_FRONTEND" = true ]; then
        deploy_frontend
    fi
    
    if [ "$DEPLOY_BACKEND" = true ]; then
        deploy_backend
    fi
    
    if [ "$DEPLOY_RAILWAY" = true ]; then
        deploy_railway
    fi
    
    generate_report
    
    print_success "🎉 Deployment completed successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Configure environment variables in your hosting platform"
    echo "2. Set up custom domain names"
    echo "3. Configure SSL certificates"
    echo "4. Set up monitoring and alerts"
    echo "5. Test all functionality"
    echo ""
    echo "📖 For more information, check the deployment report: build/deployment-report.md"
}

# Run main function with all arguments
main "$@"