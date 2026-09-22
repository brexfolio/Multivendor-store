interface HomeIconProps {
  size?: number;
  className?: string;
}

export default function HomeIcon({ size = 22, className }: HomeIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M83.5 100h-67C7.5 100 0 92.4 0 83.3V46.8c0-4.6 2-9.1 5.5-12.2L39 4.2c6.5-5.6 15.5-5.6 22 0l33.5 30.4c3.5 3 5.5 7.6 5.5 12.2v36.5c-.5 9.6-7.5 16.7-16.5 16.7M50 10.3q-2.25 0-4.5 1.5L12 42.2c-1.5 1-2 3-2 5.1v36.5c0 3.5 3 6.6 6.5 6.6H83c3.5 0 6.5-3 6.5-6.6V47.3c0-2-1-3.5-2-5.1L54 11.8c-1-1-2.5-1.5-4-1.5"
        fill="currentColor"
      />
    </svg>
  );
}
