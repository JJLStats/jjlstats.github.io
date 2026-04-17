(() => {
const timesel = document.getElementById("slide")
var active = false

const isCMActive = (ctx) => (ctx.p1.parsed?.y - ctx.p0.parsed?.y) >= 400
const skipCMColor = (ctx) => isCMActive(ctx) ? undefined : ctx.p0.options.borderColor + '29';
const skipCMDash = (ctx) => isCMActive(ctx) ? undefined : [4, 8];
const cmtoggle = document.createElement('div')

function toggleSegments() {
	const ctx = document.getElementById('myChart')
	active = !active
	if (ctx?._chart) {
		if (active) {
			cmtoggle.style.borderColor = "red"
			ctx._chart.data.datasets.forEach(dataset => {
				dataset.segment = {
					borderColor: ctx => skipCMColor(ctx),
					borderDash: ctx => skipCMDash(ctx),
				}
			});
		} else {
			ctx._chart.data.datasets.forEach(dataset => {
				dataset.segment = {
					borderColor: ctx => skipColor(ctx),
					borderDash: ctx => skipDash(ctx),
				}
			});
			cmtoggle.style.borderColor = "transparent"
		}
		ctx._chart.update()
	}
}
cmtoggle.classList.add("tf-button")
cmtoggle.innerText = "CM Vis"
cmtoggle.style = "border: 2px solid transparent;"
cmtoggle.style.position = "absolute"
cmtoggle.style.right = "5px"
cmtoggle.style.width = "70px"
timesel?.appendChild(cmtoggle)
cmtoggle.addEventListener("click", toggleSegments)

renderHooks.register('load', () => { 
	cmtoggle.style.borderColor = "transparent" 
	active = false
})
})()