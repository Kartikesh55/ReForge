import React from 'react';
import { PageHeader } from '../components/PageHeader';
import { Sparkles } from 'lucide-react';

const Modernization: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-8">
      <PageHeader 
        title="Modernization Center" 
        description="Apply modern best practices and architectural patterns post-migration."
      >
        <button className="flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-md font-medium transition-colors">
          <Sparkles className="w-4 h-4 mr-2" />
          Apply Modernization
        </button>
      </PageHeader>

      <div className="space-y-4">
        {[
          { title: 'Add Docker & Containerization', desc: 'Generate Dockerfile and docker-compose.yml for the new stack.' },
          { title: 'Setup CI/CD Pipeline', desc: 'Create GitHub Actions workflows for testing and deployment.' },
          { title: 'Implement Health Checks', desc: 'Add standardized readiness and liveness probes.' },
          { title: 'Generate OpenAPI Specs', desc: 'Extract and generate Swagger/OpenAPI documentation.' },
        ].map((item, i) => (
          <div key={i} className="flex items-start p-4 rounded-lg border border-zinc-800 bg-zinc-900">
            <div className="mt-0.5">
              <input type="checkbox" className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-purple-600 focus:ring-purple-500 focus:ring-offset-zinc-900" />
            </div>
            <div className="ml-4">
              <h4 className="text-zinc-100 font-medium">{item.title}</h4>
              <p className="text-sm text-zinc-400 mt-1">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Modernization;
