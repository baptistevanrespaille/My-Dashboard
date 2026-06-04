"use client";

import { Component, ReactNode } from "react";
import { BarChart2 } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ChartErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn("[ChartErrorBoundary] Recharts error caught:", error.message);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex flex-col items-center justify-center h-full min-h-[120px] text-zinc-700 gap-2">
            <BarChart2 size={24} />
            <p className="text-xs">Graphique indisponible</p>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
