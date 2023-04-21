var lang = !(async ()=>{
    return await fetch('./lang.json')
    .then((response) => response.json())
    .finally(() => console.log('lang.json:✓'))
})()
async function changeLang(){
    let words = document.getElementsByClassName('words')
    words.forEach(i => {
        words[i].innerHTML = lang[words[i].keyword]
    });
}