var express = require("express");
var router = express.Router();
const request = require('request')
var NodeGeocoder = require("node-geocoder");

var response = require('../util/response')
var utilities = require('../util/utilities')
var config = require('../config')

var User = require("../models/User");
var News = require("../models/News");
var Locations = require("../models/Locations");

const options = {
	provider: "google",
	// Optional depending on the providers
	httpAdapter: "https", // Default
	apiKey: config.api_key, // for Mapquest, OpenCage, Google Premier
	formatter: null // 'gpx', 'string', ...
};

const geocoder = NodeGeocoder(options);

function setPayload(type, data) {
	var payload = {
		type: type,
		data: data
	}
	return JSON.stringify(payload)
}

router.get('/', (req, res) => {
	if (req.query['hub.verify_token'] === 'ketxe24h') {
		console.log("VERIFY")
		res.send(req.query['hub.challenge'])
	} else {
		console.log("VERIFY_DINIED")
		res.send('Error, wrong token')
	}
})

router.post('/', (req, res) => {
	let messaging_events = req.body.entry[0].messaging
	// console.log(messaging_events)
	for (let i = 0; i < messaging_events.length; i++) {
		let event = req.body.entry[0].messaging[i]
		// console.log(event)
		let sender = event.sender.id
		if (event.message && event.message.attachments) {
			var attachments = event.message.attachments[0]
			console.log(attachments)
			if (attachments.type === "location") {
				//Gửi vị trí thành công
				var payload = attachments.payload;
				var latitude = payload.coordinates.lat;
				var longitude = payload.coordinates.long;
				var userID = sender;
				var created_at = new Date().toISOString();
				User
					.findOne({ user_id: userID, type: 2 })
					.then(user => {
						if (!user) {
							request({
								url: `https://graph.facebook.com/v2.6/${sender}?fields=first_name,last_name,profile_pic&access_token=${config.chatbot_token}`,
								json: true
							}, function (error, response, body) {
								if (error) {
									return console.log(error);
									sendTextMessage(sender, "Cảm ơn bạn đã đóng góp cho Kẹt Xe 24H =) =) =)")
								}
								let newUser = new User({
									user_id: userID,
									full_name: body.first_name + " " + body.last_name,
									token: "",
									fcm_token: "",
									lasted_device: "",
									total_news: 0,
									total_likes: 0,
									total_dislikes: 0,
									status_login: 2,
									type: 2
								});
								newUser.save()
									.then(user => {
										Locations
											.find({})
											.populate({
												path: "saves",
												select: "fcm_token"
											})
											.select({ __v: 0 })
											.then(locations => {
												var location = null;
												for (var i in locations) {
													if (utilities.getDistance(locations[i].latitude, locations[i].longitude, latitude, longitude) <= 50) {
														location = locations[i];
													}
												}
												if (location) {
													var payload = {
														data: {
															title: "Có vị trí kẹt xe mới",
															messageBody: location.title,
															location_id: location._id.toString()
														}
													};
													var tokens = []
													for (var i = 0; i < location.saves.length; i++) {
														// console.log(location.saves[i].fcm_token)
														if (location.saves[i].fcm_token) {
															tokens.push(location.saves[i].fcm_token)
														}
													}

													// console.log(tokens)
													var total_news = location.total_news + 1;
													Locations
														.findOneAndUpdate({ _id: location._id }, {
															total_news: total_news,
															status: true,
															last_modify: created_at
														}, { new: true })
														.then(location => {
															let newNews = new News({
																user_id: user._id,
																created_at: created_at,
																level: 0,
																description: "",
																url_image: "",
																count_like: 0,
																count_dislike: 0,
																type: 2,
																location_id: location._id,
																likes: [],
																dislikes: []
															})
															newNews
																.save()
																.then(news => {
																	utilities.onLocationChanged(req.socketIO, location)
																	if (tokens.length > 0) {
																		notification
																			.sendToDevice(tokens, payload)
																			.then(response => {
																				console.log(response)
																				sendTextMessage(sender, "Bạn có thể cho chúng tôi biết mức độ kẹt xe tại đây lúc này được không?")
																				sendLevelMessage(sender, news._id)
																			})
																	} else {
																		sendTextMessage(sender, "Bạn có thể cho chúng tôi biết mức độ kẹt xe tại đây lúc này được không?")
																		sendLevelMessage(sender, news._id)
																	}
																})
																.catch(error => {
																	console.log(error)
																	sendTextMessage(sender, "Cảm ơn bạn đã đóng góp cho Kẹt Xe 24H =) =) =)")
																})
														})
														.catch(error => {
															console.log(error)
															sendTextMessage(sender, "Cảm ơn bạn đã đóng góp cho Kẹt Xe 24H =) =) =)")
														})
												} else {
													// console.log("lat: " + latitude + " long:" + longitude)
													geocoder
														.reverse({ lat: latitude, lon: longitude })
														.then(function (result) {
															var title;
															if (result[0].streetNubmer) {
																title =
																	"Kẹt xe tại số " +
																	result[0].streetNumber +
																	", " +
																	result[0].streetName +
																	", " +
																	result[0].administrativeLevels.level2long;
															} else {
																title =
																	"Kẹt xe tại " +
																	result[0].streetName +
																	", " +
																	result[0].administrativeLevels.level2long;
															}
															let newLocation = new Locations({
																title: title,
																latitude: latitude,
																longitude: longitude,
																total_news: 1,
																total_levels: 0,
																stop_count: 0,
																rate: 0,
																lastest_image: "",
																status: true,
																current_level: 0,
																last_modify: created_at,
																saves: []
															})
															newLocation
																.save()
																.then(location => {
																	let newNews = new News({
																		user_id: user._id,
																		created_at: created_at,
																		level: 0,
																		description: title,
																		url_image: "",
																		count_like: 0,
																		count_dislike: 0,
																		location_id: location._id,
																		type: 2,
																		likes: [],
																		dislikes: []
																	})
																	newNews
																		.save()
																		.then(news => {
																			utilities.onLocationChanged(req.socketIO, location)
																			sendTextMessage(sender, "Bạn có thể cho chúng tôi biết mức độ kẹt xe tại đây lúc này được không?")
																			sendLevelMessage(sender, news._id)
																		})
																})
																.catch(error => {
																	sendTextMessage(sender, "Cảm ơn bạn đã đóng góp cho Kẹt Xe 24H =) =) =)")
																})
														}).catch(error => {
															console.log(error)
															sendTextMessage(sender, "Cảm ơn bạn đã đóng góp cho Kẹt Xe 24H =) =) =)")
														});
												}
											})
									})
									.catch(error => {
										console.log(error)
										sendTextMessage(sender, "Cảm ơn bạn đã đóng góp cho Kẹt Xe 24H =) =) =)")
									})
							});
						}
						else {
							Locations
								.find({})
								.populate({
									path: "saves",
									select: "fcm_token"
								})
								.select({ __v: 0 })
								.then(locations => {
									var location = null;
									for (var i in locations) {
										if (utilities.getDistance(locations[i].latitude, locations[i].longitude, latitude, longitude) <= 50) {
											location = locations[i];
										}
									}
									if (location) {
										var payload = {
											data: {
												title: "Có vị trí kẹt xe mới",
												messageBody: location.title,
												location_id: location._id.toString()
											}
										};
										var tokens = []
										for (var i = 0; i < location.saves.length; i++) {
											// console.log(location.saves[i].fcm_token)
											if (location.saves[i].fcm_token) {
												tokens.push(location.saves[i].fcm_token)
											}
										}
										// console.log(tokens)
										let newNews = new News({
											user_id: user._id,
											created_at: created_at,
											level: 0,
											description: "",
											url_image: "",
											count_like: 0,
											count_dislike: 0,
											type: 2,
											location_id: location._id,
											likes: [],
											dislikes: []
										})
										newNews
											.save()
											.then(news => {
												utilities.onLocationChanged(req.socketIO, location)
												if (tokens.length > 0) {
													notification
														.sendToDevice(tokens, payload)
														.then(response => {
															console.log(response)
															sendTextMessage(sender, "Bạn có thể cho chúng tôi biết mức độ kẹt xe tại đây lúc này được không?")
															sendLevelMessage(sender, news._id)
														})
												} else {
													sendTextMessage(sender, "Bạn có thể cho chúng tôi biết mức độ kẹt xe tại đây lúc này được không?")
													sendLevelMessage(sender, news._id)
												}
											})
											.catch(error => {
												console.log(error)
												sendTextMessage(sender, "Cảm ơn bạn đã đóng góp cho Kẹt Xe 24H =) =) =)")
											})
									} else {
										console.log("lat: " + latitude + " long:" + longitude)
										geocoder
											.reverse({ lat: latitude, lon: longitude })
											.then(function (result) {
												var title;
												if (result[0].streetNubmer) {
													title =
														"Kẹt xe tại số " +
														result[0].streetNumber +
														", " +
														result[0].streetName +
														", " +
														result[0].administrativeLevels.level2long;
												} else {
													title =
														"Kẹt xe tại " +
														result[0].streetName +
														", " +
														result[0].administrativeLevels.level2long;
												}
												let newLocation = new Locations({
													title: title,
													latitude: latitude,
													longitude: longitude,
													total_news: 1,
													total_levels: 0,
													stop_count: 0,
													rate: 0,
													lastest_image: "",
													status: true,
													current_level: 0,
													last_modify: created_at,
													saves: []
												})
												newLocation
													.save()
													.then(location => {
														let newNews = new News({
															user_id: user._id,
															created_at: created_at,
															level: 0,
															description: title,
															url_image: "",
															count_like: 0,
															count_dislike: 0,
															location_id: location._id,
															type: 2,
															likes: [],
															dislikes: []
														})
														newNews
															.save()
															.then(news => {
																utilities.onLocationChanged(req.socketIO, location)
																sendTextMessage(sender, "Bạn có thể cho chúng tôi biết mức độ kẹt xe tại đây lúc này được không?")
																sendLevelMessage(sender, news._id)
															})
													})
													.catch(error => {
														return res.json(response.failure(405, error.message))
														sendTextMessage(sender, "Cảm ơn bạn đã đóng góp cho Kẹt Xe 24H =) =) =)")
													})
											}).catch(error => {
												console.log(error)
												sendTextMessage(sender, "Cảm ơn bạn đã đóng góp cho Kẹt Xe 24H =) =) =)")
											});
									}
								})
						}
					})
					.catch(error => {
						console.log(error)
						sendTextMessage(sender, "Cảm ơn bạn đã đóng góp cho Kẹt Xe 24H =) =) =)")
					})
			}
			if (attachments.type === "image") {
				//Hoàn thành
				// { type: 'image',
				// payload:{ url: 'https://scontent-iad3-1.xx.fbcdn.net/v/t35.0-12/25855836_1975729492676578_1643219367_o.png?_nc_ad=z-m&_nc_cid=0&oh=9bf4baa36eccfcd3b6eef2d12b0e6219&oe=5A408198' } 
				// }
				User
					.findOne({ user_id: sender })
					.then(user => {
						if (!user) {
							sendTextMessage(sender, "Cảm ơn bạn đã đóng góp cho Kẹt Xe 24H =) =) =) !!!")
						}
						News
							.findOneAndUpdate({ user_id: user._id, url_image: "" }, { url_image: attachments.payload.url }, { news: true })
							.sort('-_id')
							.then(news => {
								if (!news) {
									return sendTextMessage(sender, "Cảm ơn bạn đã đóng góp cho Kẹt Xe 24H =) =) =) !!!")
								}
								Locations
									.findOneAndUpdate({ _id: news.location_id }, { lastest_image: attachments.payload.url }, { new: true })
									.then(location => {
										sendTextMessage(sender, "Cảm ơn bạn đã đóng góp cho Kẹt Xe 24H =) =) =) !!!")
									})
									.catch(error => {
										console.log(error)
										sendTextMessage(sender, "Cảm ơn bạn đã đóng góp cho Kẹt Xe 24H =) =) =) !!!")
									})
							})
							.catch(error => {
								console.log(error)
								sendTextMessage(sender, "Cảm ơn bạn đã đóng góp cho Kẹt Xe 24H =) =) =) !!!")
							})
					})
					.catch(error => {
						console.log(error)
						sendTextMessage(sender, "Cảm ơn bạn đã đóng góp cho Kẹt Xe 24H =) =) =) !!!")
					})
			}
		}
		if (event.message && event.message.text) {
			sendGenericMessage(sender)
		}
		if (event.postback) {
			// console.log(event.postback)
			if (event.postback.payload) {
				// console.log(event.postback.payload)
				var spayload = event.postback.payload;
				var payload = JSON.parse(spayload)
				console.log(payload)
				if (payload) {
					var data = payload.data;
					if (payload.type === 1) {
						//Gửi level thành công
						//payload {level: x}
						News
							.findOneAndUpdate({ _id: data.news_id }, { level: data.level }, { new: true })
							.then(news => {
								// console.log(news)
								if (news) {
									Locations
										.findOne({ _id: news.location_id })
										.then(location => {
											console.log(location.total_level)
											console.log(location.total_news)
											console.log(data.level)
											var total_level = location.total_level + data.level;
											console.log(total_level)
											var average_rate = total_level / location.total_news;
											console.log(average_rate)

											// Locations
											// 	.findOneAndUpdate({ _id: location._id }, { total_level: total_level, average_rate: average_rate }, {})
											// 	.then(newlocation => {
											// 		sendTextMessage(sender, "Bạn có muốn gửi hình ảnh tại đây cho chúng tôi không?")
											// 		sendImageMessage(sender, news._id)
											// 	})
										})
										.catch(error => {
											console.log(error)
											sendTextMessage(sender, "Cảm ơn bạn đã đóng góp cho Kẹt Xe 24H =) =) =) !!!")
										})
								}
							})
							.catch(error => {
								console.log(error)
								sendTextMessage(sender, "Cảm ơn bạn đã đóng góp cho Kẹt Xe 24H =) =) =) !!!")
							})
					}
					if (payload.type === 2) {
						if (data.type_reply === 1) {
							//Có hình ảnh
							sendTextMessage(sender, "Bạn hãy tải hình hoặc video lên cho chúng tôi nhé")
						} else
							//Không gửi hình ảnh
							sendTextMessage(sender, "Cảm ơn bạn đã đóng góp cho Kẹt Xe 24H =) =) =) !!!")
					}
					if (payload.type === 3) {
						sendLocationMessage(sender)
					}
				} else {
					sendTextMessage(sender, "Cảm ơn bạn đã đóng góp cho Kẹt Xe 24H =) =) =) !!!")
				}
			}
			continue
		}
	}
	res.sendStatus(200)
})

function sendTextMessage(sender, text) {
	let messageData = { text: text }
	request({
		url: 'https://graph.facebook.com/v2.6/me/messages',
		qs: { access_token: config.chatbot_token },
		method: 'POST',
		json: {
			recipient: { id: sender },
			message: messageData
		}
	}, function (error, response, body) {
		if (error) {
			console.log('Error sending messages: ', error)
		} else if (response.body.error) {
			console.log('Error: ', response.body.error)
		}
	})
}

function sendGenericMessage(sender) {
	let messageData = {
		"attachment": {
			"type": "template",
			"payload": {
				"template_type": "generic",
				"elements": [{
					"title": "Kẹt Xe 24H",
					"subtitle": "Giải pháp cho đường về nhà",
					"image_url": "https://scontent.fsgn5-4.fna.fbcdn.net/v/t31.0-8/26685685_205968066617950_2090294468182715343_o.png?oh=b69d124d1c1cbef1d00a1cf36a249d67&oe=5B151DEC",
					"buttons": [{
						"type": "web_url",
						"url": "https://www.ketxe24h.com",
						"title": "Về chúng tôi"
					}, {
						"type": "postback",
						"title": "Thông báo kẹt xe",
						"payload": setPayload(3, {}),
					}],
				}]
			}
		}
	}
	request({
		url: 'https://graph.facebook.com/v2.6/me/messages',
		qs: { access_token: config.chatbot_token },
		method: 'POST',
		json: {
			recipient: { id: sender },
			message: messageData,
		}
	}, function (error, response, body) {
		if (error) {
			console.log('Error sending messages: ', error)
		} else if (response.body.error) {
			console.log('Error: ', response.body.error)
		}
	})
}

function sendImageMessage(sender, news_id) {
	let messageData = {
		"attachment": {
			"type": "template",
			"payload": {
				"template_type": "generic",
				"elements": [{
					"title": "Mức độ kẹt xe",
					"buttons": [{
						"type": "postback",
						"title": "Có chứ",
						"payload": setPayload(2, { type_reply: 1 })
					},
					{
						"type": "postback",
						"title": "Không, lần khác nhé",
						"payload": setPayload(2, { type_reply: 2 })
					}]
				}]
			}
		}
	}
	request({
		url: 'https://graph.facebook.com/v2.6/me/messages',
		qs: { access_token: config.chatbot_token },
		method: 'POST',
		json: {
			recipient: { id: sender },
			message: messageData,
		}
	}, function (error, response, body) {
		if (error) {
			console.log('Error sending messages: ', error)
		} else if (response.body.error) {
			console.log('Error: ', response.body.error)
		}
	})
}

function sendLevelMessage(sender, news_id) {
	var data1 = {
		level: 2,
		news_id: news_id
	}
	var data2 = {
		level: 3.5,
		news_id: news_id
	}
	var data3 = {
		level: 5,
		news_id: news_id
	}
	let messageData = {
		"attachment": {
			"type": "template",
			"payload": {
				"template_type": "generic",
				"elements": [{
					"title": "Mức độ kẹt xe",
					"buttons": [{
						"type": "postback",
						"title": "Đông xe",
						"payload": setPayload(1, data1)
					},
					{
						"type": "postback",
						"title": "Rất khó di chuyển",
						"payload": setPayload(1, data2)
					}, {
						"type": "postback",
						"title": "Không thể di chuyển",
						"payload": setPayload(1, data3)
					}]
				}]
			}
		}
	}
	request({
		url: 'https://graph.facebook.com/v2.6/me/messages',
		qs: { access_token: config.chatbot_token },
		method: 'POST',
		json: {
			recipient: { id: sender },
			message: messageData,
		}
	}, function (error, response, body) {
		if (error) {
			console.log('Error sending messages: ', error)
		} else if (response.body.error) {
			console.log('Error: ', response.body.error)
		}
	})
}

function sendLocationMessage(sender) {
	let messageData = {
		"text": "Bạn có thể cho chúng tôi biết về vị trí kẹt xe hiện tại được không?",
		"quick_replies": [
			{
				"content_type": "location"
			}
		]
	}
	request({
		url: 'https://graph.facebook.com/v2.6/me/messages',
		qs: { access_token: config.chatbot_token },
		method: 'POST',
		json: {
			recipient: { id: sender },
			message: messageData,
		}
	}, function (error, response, body) {
		if (error) {
			console.log('Error sending messages: ', error)
		} else if (response.body.error) {
			console.log('Error: ', response.body.error)
		}
	})
}

module.exports = router;
