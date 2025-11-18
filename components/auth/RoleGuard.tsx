"use client";

import React, { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: string | string[];
  fallback?: ReactNode;
  showFallback?: boolean;
}

export function RoleGuard({ 
  children, 
  allowedRoles, 
  fallback,
  showFallback = true 
}: RoleGuardProps) {
  const { user, loading, hasRole, isAuthenticated } = useAuth();
  const router = useRouter();

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardHeader className="text-center">
          <Lock className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
          <CardTitle>Authentication Required</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            You need to be logged in to access this content.
          </p>
          <Button onClick={() => router.push('/login')}>
            Go to Login
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Check if user has required role
  const hasRequiredRole = hasRole(allowedRoles);

  if (!hasRequiredRole) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (!showFallback) {
      return null;
    }

    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardHeader className="text-center">
          <AlertTriangle className="w-12 h-12 mx-auto text-destructive mb-2" />
          <CardTitle>Access Restricted</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            You don't have the required permissions to access this content.
          </p>
          <div className="text-sm text-muted-foreground">
            <p>Your role: <span className="font-medium capitalize">{user?.role?.replace('_', ' ')}</span></p>
            <p>Required role(s): <span className="font-medium">
              {Array.isArray(allowedRoles) 
                ? allowedRoles.map(role => role.replace('_', ' ')).join(', ')
                : allowedRoles.replace('_', ' ')
              }
            </span></p>
          </div>
          <Button variant="outline" onClick={() => router.push('/')}>
            Return to Dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}

export default RoleGuard; 