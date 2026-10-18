const ENDPOINT = 'https://www.hinduaarti.com/api/mcp';

async function callSource(name, args = {}) {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`HinduAarti returned ${response.status}`);
  const message = await response.json();
  if (message.error || message.result?.isError) throw new Error(JSON.stringify(message.error || message.result));
  const result = message.result;
  return result.structuredContent || JSON.parse(result.content.find(part => part.type === 'text').text);
}

module.exports = { callSource, ENDPOINT };
if (require.main === module) callSource(process.argv[2], JSON.parse(process.argv[3] || '{}'))
  .then(value => console.log(JSON.stringify(value, null, 2)))
  .catch(error => { console.error(error.message); process.exitCode = 1; });
