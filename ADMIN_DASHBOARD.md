# Admin Dashboard Documentation

## Overview

The admin dashboard provides comprehensive metrics and analytics for the Remlo platform, allowing administrators to monitor user activity, transaction volumes, payment links, and overall platform health.

## Access Control

### Development Environment
- Any authenticated user can access the admin dashboard
- Useful for testing and development purposes

### Production Environment
- Only users with admin email addresses can access the dashboard
- Admin emails are configured in:
  - `/src/app/api/admin/metrics/route.ts`
  - `/src/middleware.ts`
  - `/src/components/header.tsx`

### Current Admin Emails
- `admin@remlo.com`
- `hello.notmove@gmail.com`

## Features

### 1. Overview Tab
- **Key Metrics Cards**: Total users, transactions, payment links, and volume
- **User Distribution Chart**: Pie chart showing user types (with wallets, passcode, MPC, basic)
- **Transaction Status Chart**: Bar chart showing executed, pending, and failed transactions

### 2. Users Tab
- **User Growth**: New registrations (today, week, month)
- **Feature Adoption**: Users with wallets, passcode, MPC
- **Total Users**: Platform overview with total registered users

### 3. Transactions Tab
- **Status Breakdown**: Total, executed, pending, failed transactions
- **Volume Analysis**: USDC and USDS transaction volumes with time-based breakdown
- **Volume by Source**: Detailed breakdown showing transactions, payment links, and payment requests
- **Time-based Metrics**: Today, week, month transaction counts

### 4. Volume Tab
- **Volume Overview**: Total, USDC, USDS, and USDS circulation metrics
- **Token Distribution**: USDC vs USDS volume comparison
- **Source Breakdown**: Volume analysis by platform feature (transactions, payment links, requests)
- **Detailed Analytics**: Time-based volume trends for each source
- **USDS Ecosystem**: Specialized metrics for USDS circulation, total volume, and swap volume
- **Volume Trends**: Visual comparison of daily, weekly, and monthly volumes

### 5. Payments Tab
- **Payment Links**: Status breakdown (active, claimed, expired)
- **Payment Requests**: Status breakdown (pending, completed, cancelled)
- **Visual Charts**: Pie charts for easy status visualization

### 6. Activity Tab
- **Recent Activity Feed**: Latest 20 platform activities
- **Activity Types**: User signups, transactions, payment links, payment requests
- **Real-time Updates**: Timestamps and relevant details for each activity

## API Endpoints

### GET `/api/admin/metrics`
Returns comprehensive platform metrics including:

```typescript
interface AdminMetrics {
  users: {
    total: number;
    withWallets: number;
    withPasscode: number;
    usingMPC: number;
    newToday: number;
    newThisWeek: number;
    newThisMonth: number;
  };
  transactions: {
    total: number;
    pending: number;
    executed: number;
    failed: number;
    todayCount: number;
    weekCount: number;
    monthCount: number;
  };
  paymentLinks: {
    total: number;
    active: number;
    claimed: number;
    expired: number;
    todayCount: number;
    weekCount: number;
    monthCount: number;
  };
  paymentRequests: {
    total: number;
    pending: number;
    completed: number;
    cancelled: number;
    todayCount: number;
    weekCount: number;
    monthCount: number;
  };
  volume: {
    totalUSDC: number;
    totalUSDS: number;
    todayUSDC: number;
    todayUSDS: number;
    weekUSDC: number;
    weekUSDS: number;
    monthUSDC: number;
    monthUSDS: number;
    swapVolume: number;
    usdsCirculation: number;
    transactions: {
      totalUSDC: number;
      totalUSDS: number;
      todayUSDC: number;
      todayUSDS: number;
      weekUSDC: number;
      weekUSDS: number;
      monthUSDC: number;
      monthUSDS: number;
    };
    paymentLinks: {
      totalUSDC: number;
      totalUSDS: number;
      todayUSDC: number;
      todayUSDS: number;
      weekUSDC: number;
      weekUSDS: number;
      monthUSDC: number;
      monthUSDS: number;
    };
    paymentRequests: {
      totalUSDC: number;
      totalUSDS: number;
      todayUSDC: number;
      todayUSDS: number;
      weekUSDC: number;
      weekUSDS: number;
      monthUSDC: number;
      monthUSDS: number;
    };
  };
  recentActivity: Array<{
    id: string;
    type: 'user_signup' | 'transaction' | 'payment_link' | 'payment_request';
    description: string;
    timestamp: string;
    amount?: string;
    tokenType?: string;
  }>;
}
```

## Security Features

### Authentication
- NextAuth.js integration for secure authentication
- Session-based access control
- Automatic redirection for unauthorized users

### Authorization
- Email-based admin role checking
- Environment-specific access rules
- Middleware protection for admin routes

### Data Protection
- No sensitive user data exposed (emails are masked in activity feed)
- Aggregated metrics only
- Secure API endpoints with proper error handling

## Technical Implementation

### Frontend Components
- **Admin Dashboard Page**: `/src/app/admin/page.tsx`
- **Metrics Chart Component**: `/src/components/admin/MetricsChart.tsx`
- **Custom UI Components**: Card, Button, Badge components

### Backend Services
- **Metrics API**: `/src/app/api/admin/metrics/route.ts`
- **Database Queries**: Optimized Prisma queries with parallel execution
- **Data Processing**: Real-time calculation of metrics and aggregations

### Middleware
- **Route Protection**: `/src/middleware.ts`
- **Authentication Check**: NextAuth middleware integration
- **Admin Role Verification**: Email-based authorization

## Usage Instructions

### Accessing the Dashboard
1. Sign in to your Remlo account
2. Navigate to `/admin` or click the "Admin" link in the navigation (visible to admin users)
3. The dashboard will load with real-time metrics

### Navigation
- Use the tab navigation to switch between different metric views
- Click "Refresh" to update metrics manually
- All data is automatically formatted for readability

### Understanding Metrics
- **Currency Values**: Displayed in USD format with proper formatting
- **Numbers**: Formatted with thousand separators for readability
- **Percentages**: Calculated in real-time based on current data
- **Time Ranges**: Today, this week, this month comparisons

## Monitoring Capabilities

### Real-time Metrics
- User registration trends
- Transaction success/failure rates
- Payment link utilization
- Comprehensive volume tracking across different tokens and sources
- USDS circulation monitoring
- Volume breakdown by platform features (transactions, payment links, payment requests)

### Performance Indicators
- Platform adoption rates (wallet setup, feature usage)
- Transaction processing efficiency
- Payment method preferences
- User engagement patterns

### Business Intelligence
- Revenue tracking through comprehensive volume analysis
- USDC vs USDS adoption and usage patterns
- USDS circulation and ecosystem health
- User growth analysis
- Feature adoption metrics across different payment methods
- Platform health monitoring with detailed volume breakdowns

## Customization

### Adding New Metrics
1. Update the `AdminMetrics` interface
2. Add database queries in the metrics API endpoint
3. Update the frontend components to display new data
4. Add appropriate charts or visualizations

### Modifying Access Control
1. Update admin email lists in relevant files
2. Modify middleware rules if needed
3. Adjust frontend visibility logic

### Styling and UI
- All components use Tailwind CSS
- Dark theme optimized for admin use
- Responsive design for different screen sizes
- Consistent with Remlo brand colors

## Troubleshooting

### Common Issues
1. **Access Denied**: Check if user email is in admin list
2. **Data Not Loading**: Verify database connection and API endpoints
3. **Charts Not Displaying**: Check if data is properly formatted

### Error Handling
- Graceful error messages for API failures
- Loading states for better user experience
- Retry functionality for failed requests

## Future Enhancements

### Planned Features
- Export functionality for metrics data
- Advanced filtering and date range selection
- Email alerts for critical metrics
- More detailed user analytics
- Performance optimization metrics

### Scalability Considerations
- Database query optimization for large datasets
- Caching strategies for frequently accessed metrics
- Real-time updates using WebSocket connections
- Advanced charting libraries for complex visualizations

## Security Considerations

### Data Privacy
- No personal user information displayed
- Aggregated data only
- Secure API endpoints
- Proper error handling to prevent data leaks

### Access Logging
- Consider implementing access logs for admin dashboard usage
- Monitor for unusual access patterns
- Regular security audits of admin functionality

## Maintenance

### Regular Tasks
- Monitor dashboard performance
- Update admin email lists as needed
- Review and optimize database queries
- Test functionality after platform updates

### Database Considerations
- Ensure proper indexing for metric queries
- Monitor query performance as data grows
- Consider archiving old data for performance
- Regular backup verification for admin-related data 