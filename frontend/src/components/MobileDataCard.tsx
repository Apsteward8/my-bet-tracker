// components/MobileDataCard.tsx
interface Props {
    title: string;
    children: React.ReactNode;
    className?: string;
  }
  
  export default function MobileDataCard({ title, children, className = "" }: Props) {
    return (
      <div className={`bg-white p-4 rounded-lg shadow mb-4 ${className}`}>
        <h3 className="font-medium text-gray-700 mb-2">{title}</h3>
        <div className="space-y-2">
          {children}
        </div>
      </div>
    );
  }