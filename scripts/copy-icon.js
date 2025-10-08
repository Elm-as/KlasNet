const copyIcon = document.getElementById('copy-icon');

copyIcon.addEventListener('click', () => {
    const textToCopy = document.getElementById('text-to-copy').innerText;
    navigator.clipboard.writeText(textToCopy).then(() => {
        console.log('Text copied to clipboard');
    }).catch(err => {
        console.error('Error copying text: ', err);
    });
});
