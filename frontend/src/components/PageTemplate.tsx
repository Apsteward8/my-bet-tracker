// components/PageTemplate.tsx
export default function PageTemplate({ 
    title, 
    description,
    icon = "📄" 
  }: { 
    title: string; 
    description?: string;
    icon?: string;
  }) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <span>{icon}</span> {title}
            </h1>
            {description && (
              <p className="text-gray-500 mt-1">{description}</p>
            )}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-col items-center justify-center py-12">
            <div className="text-5xl mb-4">🚧</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Coming Soon</h2>
            <p className="text-gray-500 text-center max-w-md">
              This page is currently under development. Check back soon for updates!
            </p>
          </div>
        </div>
      </div>
    );
  }