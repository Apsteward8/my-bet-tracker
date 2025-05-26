// components/ResponsiveTable.tsx
interface Props {
    headers: string[];
    data: any[];
    renderRow: (item: any, index: number) => React.ReactNode;
    emptyMessage?: string;
    className?: string;
  }
  
  export default function ResponsiveTable({ headers, data, renderRow, emptyMessage = "No data available", className = "" }: Props) {
    return (
      <div className={`overflow-x-auto -mx-4 sm:mx-0 ${className}`}>
        <div className="inline-block min-w-full align-middle">
          <table className="data-table min-w-full">
            <thead>
              <tr>
                {headers.map((header, index) => (
                  <th key={index}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.length > 0 ? (
                data.map((item, index) => renderRow(item, index))
              ) : (
                <tr>
                  <td colSpan={headers.length} className="p-4 text-center text-gray-500">
                    {emptyMessage}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }