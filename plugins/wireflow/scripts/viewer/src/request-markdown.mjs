// The change requests as the markdown the copy button puts on the clipboard. `wireflow:revise`
// parses this text, so its heading and line formats must stay as they are.

export function requestsMarkdown({ authored, meta, applied, requests }, T) {
  const appliedIds = applied.length ? applied.map((id) => `\`${id}\``).join(', ') : '—';
  const lines = requests.map((q, i) => {
    const target = `${q.number} \`${q.screen}\`${q.action ? ` › action \`${q.action}\`` : ''}`;
    return `${i + 1}. [${target}] ${q.text}`;
  });
  return [
    `${T.requestHeading} — ${authored.title}`,
    `- flow: \`${authored.id}\` · ${T.file}: \`${meta.source}\` · viewer: \`${meta.output}\``,
    `- ${T.applied}: ${appliedIds}`,
    '',
    ...lines,
  ].join('\n');
}
