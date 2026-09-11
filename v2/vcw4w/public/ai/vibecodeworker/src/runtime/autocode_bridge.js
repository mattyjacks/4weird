/**
 * AutoCode IDE Bridge & UI Diff Coordinator
 */

function renderAutoCodeDiff(container, diff) {
  if (!container) return;
  container.innerHTML = '';
  diff.forEach(line => {
    const div = document.createElement('div');
    if (line.type === 'add') {
      div.className = 'diff-add';
      div.textContent = `+ ${line.content}`;
    } else if (line.type === 'remove') {
      div.className = 'diff-remove';
      div.textContent = `- ${line.content}`;
    } else {
      div.className = 'diff-unchanged';
      div.textContent = `  ${line.content}`;
    }
    container.appendChild(div);
  });
}

function estimateCost(codeContent, promptText) {
  const codeLen = codeContent ? codeContent.length : 0;
  const promptLen = promptText ? promptText.length : 0;
  const totalChars = codeLen + promptLen + 1000;
  const estTokens = Math.ceil(totalChars / 4);
  return estTokens * 0.0000015;
}

module.exports = {
  renderAutoCodeDiff,
  estimateCost
};
