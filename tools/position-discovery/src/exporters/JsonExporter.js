const fs = require('fs').promises;
const path = require('path');

class JsonExporter {
  constructor(outputDir = './output') {
    this.outputDir = outputDir;
  }

  async export(events, filename) {
    await this._ensureOutputDir();
    
    const exportData = {
      timestamp: new Date().toISOString(),
      totalEvents: events.length,
      events: events
    };
    
    const filePath = path.join(this.outputDir, filename);
    await fs.writeFile(filePath, JSON.stringify(exportData, null, 2), 'utf8');
    
    return {
      filePath,
      eventCount: events.length,
      format: 'json'
    };
  }

  generateFilename(prefix = 'position-deployed') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${prefix}-${timestamp}.json`;
  }

  async _ensureOutputDir() {
    try {
      await fs.access(this.outputDir);
    } catch {
      await fs.mkdir(this.outputDir, { recursive: true });
    }
  }
}

module.exports = JsonExporter;