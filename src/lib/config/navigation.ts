export interface NavItem {
  label: string;
  href: string;
  description: string;
  badge?: string;
}

export const primaryNavItems: readonly NavItem[] = [
  {
    label: "Overview",
    href: "/",
    description: "Landing page and repository submission",
  },
  {
    label: "Project Analysis",
    href: "/analysis",
    description: "Your project explained in plain English and visual architecture flow",
  },
  {
    label: "Interview Practice",
    href: "/grill",
    description: "One-by-one interview questions grounded in your actual code",
  },
  {
    label: "My Feedback",
    href: "/report",
    description: "Educational feedback, model answers, and revision guide",
  },
] as const;

export const productFlowSteps = [
  {
    step: 1,
    label: "1. Project Analysis",
    href: "/analysis",
  },
  {
    step: 2,
    label: "2. Interview Practice",
    href: "/grill",
  },
  {
    step: 3,
    label: "3. My Feedback",
    href: "/report",
  },
] as const;
