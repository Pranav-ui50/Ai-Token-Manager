/**
 * Tabs Component
 *
 * Reusable tab navigation.
 */

function Tabs({ tabs, activeTab, onChange }) {
  return (
    <nav className="flex space-x-8 border-b border-gray-200">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`
            py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap
            ${activeTab === tab.id
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }
          `}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={`ml-2 py-0.5 px-2.5 rounded-full text-xs font-medium ${
              activeTab === tab.id
                ? 'bg-primary-100 text-primary-600'
                : 'bg-gray-100 text-gray-600'
            }`}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </nav>
  );
}

export default Tabs;
