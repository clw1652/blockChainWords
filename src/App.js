import React, { Component } from 'react'
import SimpleStorageContract from '../build/contracts/SimpleStorage.json'
import getWeb3 from './utils/getWeb3'
// animate
import { StyleSheet, css } from 'aphrodite';
import { spaceInLeft, spaceOutRight } from 'react-magic';

import './css/oswald.css'
import './css/open-sans.css'
import './css/pure-min.css'
import './App.css'

const abi = [ { "constant": false, "inputs": [ { "name": "s", "type": "string" }, { "name": "t", "type": "string" } ], "name": "setWord", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": true, "inputs": [ { "name": "random", "type": "uint256" } ], "name": "getRandomWord", "outputs": [ { "name": "", "type": "uint256" }, { "name": "", "type": "string" }, { "name": "", "type": "address" }, { "name": "", "type": "string" } ], "payable": false, "stateMutability": "view", "type": "function" } ];
let mycontract;


// animate style
const styles = StyleSheet.create({
    in: {
        animationName: spaceInLeft,
        animationDuration: '3s'
    },
    out: {
        animationName: spaceOutRight,
        animationDuration: '3s'
    }
});

const contractAddress = "0xb3e2957f9aa802a6287ef067e91d76eada7d6322" // 合约地址
var simpleStorageInstance // 合约实例


class App extends Component {

	constructor(props) {
		super(props)
		this.state = {
            word: null,
            from: null,
            timestamp: null,
			random: 0,
			count: 0,
			input: '',
            web3: null,
            emptyTip: "还没有留言，快来创建全世界第一条留言吧~",
            firstTimeLoad: true,
            loading: false,
            loadingTip: "留言写入所需时间不等（10s~5min），请耐心等待~",
            waitingTip: "留言写入所需时间不等（10s~5min），请耐心等待~",
            successTip: "留言成功",
            animate: "",
            in: css(styles.in),
            out: css(styles.out)
		}
	}

	componentWillMount() {
		getWeb3
		.then(results => {
			this.setState({
				web3: results.web3
			})
            //使用原生api构造合约实例
            console.log('provider :', this.state.web3.currentProvider);
            mycontract = new results.web3.eth.Contract(abi, contractAddress);
            console.log('mycontract :', mycontract);

			this.instantiateContract()
		})
		.catch(() => {
			console.log('Error finding web3.')
		})
	}

    // 循环从区块上随机读取留言
	randerWord() {
        const that = this
		setInterval(() => {
			let random_num = Math.random() * (this.state.count? this.state.count: 0)
			this.setState({
				random: parseInt(random_num)
			})
			// console.log("setInterval读取", this.state.random)
			simpleStorageInstance.getRandomWord(this.state.random)
			.then(result => {
                // console.log("setInterval读取成功", result)
                if(result[1]!=this.setState.word){
                    this.setState({
                        animate: this.state.out
                    })
                    setTimeout(() => {
                        that.setState({
                            count: result[0].c[0],
                            word: result[1],
                            from: result[2],
                            timestamp: result[3],
                            animate: this.state.in
                        })
                    }, 2000)
                }
			})
		}, 2000)
	}

	instantiateContract() {
        const that = this
		const contract = require('truffle-contract')
		const simpleStorage = contract(SimpleStorageContract)
		simpleStorage.setProvider(this.state.web3.currentProvider)

		// Get accounts.
		this.state.web3.eth.getAccounts((error, accounts) => {
			simpleStorage.at(contractAddress).then(instance => {
				simpleStorageInstance = instance
				//console.log("合约实例获取成功")
			})
			.then(result => {
				return simpleStorageInstance.getRandomWord(this.state.random)
			})
			.then(result => {
                //console.log("读取成功", result)
                if(result[1]!=this.setState.word){
                    this.setState({
                        animate: this.state.out
                    })
                    setTimeout(() => {
                        that.setState({
                            count: result[0].c[0],
                            word: result[1],
                            from: result[2],
                            timestamp: result[3],
                            animate: this.state.in,
                            firstTimeLoad: false
                        })
                    }, 2000)
                }else{
                    this.setState({
                        firstTimeLoad: false
                    })
                }
				this.randerWord()
			})

		})
	}

  	render() {
		return (
			<div className="container">
				
				<main>
					<div className="main-container">
						<div className="showword">
                            <div className={this.state.animate}>
                                {
                                    (simpleStorageInstance && !this.state.firstTimeLoad)
                                    ? <span className={this.state.animate}>{this.state.word || this.state.emptyTip}</span>
                                    : <img src={require("../public/loading/loading-bubbles.svg")} width="64" height="64"/>
                                }
                            </div>
                            <p className={this.state.animate}>
                                <span>{this.state.word? "来源："+this.state.from: ""}</span>
                                <span>{this.state.word? "时间："+this.formatTime(this.state.timestamp): ""}</span>
                            </p>
                        </div>
						<div className="setword">
							<input type="text" value={this.state.input} onChange={e => this.inputWord(e)}/>
							<button onClick={() => this.setWord()}>写入</button>
						</div>
						
					</div>
				</main>
				
                <div className={this.state.loading? "loading show": "loading"}>
                    <img src={require("../public/loading/loading-bubbles.svg")} width="128" height="128"/>
                    <p>Matemask 钱包确认支付后开始写入留言</p>
                    <p>{this.state.loadingTip}</p>
                </div>
			</div>
		);
	}
	inputWord(e){
		this.setState({
			input: e.target.value
		})
    }
    // 写入区块链
	async setWord(){
        if(!this.state.input) return
        const that = this
        this.setState({
            loading: true
        })
		let timestamp = new Date().getTime()
        let accounts = await this.state.web3.eth.getAccounts();
        // let account0 = '0x22c57F0537414FD95b9f0f08f1E51d8b96F14029';
        const currentAccount = accounts[0];
        console.log('account 0 :', currentAccount);
        console.log('simpleStorageInstance:', simpleStorageInstance);

        try {
            // let result = await simpleStorageInstance.setWord(this.state.input, String(timestamp), {from: currentAccount})
            let result = await mycontract.methods.setWord(this.state.input, String(timestamp)).send({
                from: currentAccount,
                gas : 3000000,
            });
            console.log('write successfully!', result);
            alert(`transactionHash : , ${result.transactionHash}`);

            this.setState({
                loadingTip: that.state.successTip
            })
            setTimeout(() => {
                that.setState({
                    loading: false,
                    input: '',
                    loadingTip: that.state.waitingTip
                })
            }, 1500)

        } catch (e) {
            console.log('set failed!', e);
            // 拒绝支付
            this.setState({
                loading: false
            })
        }

	}
    // 时间戳转义
    formatTime(timestamp) {
        let date = new Date(Number(timestamp))
        let year = date.getFullYear()
        let month = date.getMonth() + 1
        let day = date.getDate()
        let hour = date.getHours()
        let minute = date.getMinutes()
        let second = date.getSeconds()
        let fDate = [year, month, day, ].map(this.formatNumber)
        return fDate[0] + '年' + fDate[1] + '月' + fDate[2] + '日' + ' ' + [hour, minute, second].map(this.formatNumber).join(':') 
    }
    /** 小于10的数字前面加0 */
    formatNumber(n) {
        n = n.toString()
        return n[1] ? n : '0' + n
    }
}

export default App
