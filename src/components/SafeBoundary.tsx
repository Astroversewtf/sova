"use client";

import React from "react";

interface SafeBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  name?: string;
}

interface SafeBoundaryState {
  hasError: boolean;
}

export class SafeBoundary extends React.Component<SafeBoundaryProps, SafeBoundaryState> {
  state: SafeBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // Keep app interactive even if optional overlays/controllers fail.
    console.error(`[SafeBoundary:${this.props.name ?? "unknown"}]`, error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}

