import * as React from "react";
const DoubleArrowCurve = (props: any) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    {...props}
  >
    <defs>
      <marker
        id="arrowStart"
        markerWidth={4}
        markerHeight={4}
        refX={2}
        refY={2}
        orient="auto"
        markerUnits="userSpaceOnUse"
      >
        <path d="M1,2 L2,1 L2,3 Z" fill="currentColor" />
      </marker>
      <marker
        id="arrowEnd"
        markerWidth={4}
        markerHeight={4}
        refX={2}
        refY={2}
        orient="auto"
        markerUnits="userSpaceOnUse"
      >
        <path d="M3,2 L2,1 L2,3 Z" fill="currentColor" />
      </marker>
    </defs>
    <path
      d="M6 4 C18 4, 6 20, 18 20"
      strokeLinecap="round"
      strokeLinejoin="round"
      markerStart="url(#arrowStart)"
      markerEnd="url(#arrowEnd)"
    />
  </svg>
);
export default DoubleArrowCurve;
