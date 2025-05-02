// components/LoadingSpinner.tsx
interface LoadingSpinnerProps {
    size?: 'small' | 'medium' | 'large';
    message?: string;
    fullPage?: boolean;
  }
  
  export default function LoadingSpinner({ 
    size = 'medium', 
    message = 'Loading...', 
    fullPage = false 
  }: LoadingSpinnerProps) {
    // Determine spinner size
    const spinnerSizes = {
      small: 'h-6 w-6 border-2',
      medium: 'h-10 w-10 border-3',
      large: 'h-16 w-16 border-4',
    };
    
    const spinnerSize = spinnerSizes[size];
    
    // Container class based on whether it's fullPage or not
    const containerClass = fullPage 
      ? 'flex items-center justify-center fixed inset-0 bg-white bg-opacity-80 z-50' 
      : 'flex flex-col items-center justify-center p-8';
  
    return (
      <div className={containerClass}>
        <div className={`${spinnerSize} animate-spin rounded-full border-t-blue-500 border-r-transparent border-b-blue-500 border-l-transparent`}></div>
        {message && (
          <p className="mt-4 text-gray-600 font-medium">{message}</p>
        )}
      </div>
    );
  }