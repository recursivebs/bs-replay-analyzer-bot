const { SlashCommandBuilder } = require('@discordjs/builders');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const { MessageAttachment, Message } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('test')
		.setDescription('Renders a test chart.'),
	async execute(interaction) {

		await interaction.deferReply();

		let data = [
			{
				"members": 946,
				"date": "10/21/2019"
			}, {
				"members": 1458,
				"date": "10/22/2019"
			}, {
				"members": 1999,
				"date": "10/23/2019"
			}
		];

		const members = []
		const date = []

		const width = 800
		const height = 600

		for (const item of data) {
			members.push(item.members)
			date.push(item.date)
		}

		const backgroundColour = 'white'

		const canvas = new ChartJSNodeCanvas({
			width, height, backgroundColour
		})

		const configuration = {
			type: 'bar',
			data: {
				labels: date,
				datasets: [
					{
						label: 'Discord Members',
						data: members,
						backgroundColor: '#7289d9'
					},
				],
			},
		}

		const image = await canvas.renderToBuffer(configuration)
		const attachment = new MessageAttachment(image)
		await interaction.editReply({files: [attachment]});

	},
};