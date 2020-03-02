(() => {
  //定义常量
  const PENDING = 'pending' //初始化状态
  const RESOLVED = 'resolved' //成功状态
  const REJECTED = 'rejected' //失败状态

  class Promise {
    constructor(executor) {
      const self = this
      // 初始化状态数据
      // 状态属性,初始化值为pending,后面会改变为:resolve/reject
      self.status = PENDING //实例一开始是pending状态
      // 用来保存将来产生了成功数据(value)或/失败数据(reason)
      self.data = undefined //实例一开始数据为undefined
      // 用来存储包含待处理onResolved和onRejected回调函数方法的对象的数组
      self.callbacks = [] //实例对应的一组一组的回调们,形如[{onResolved:function,onReject:function},...]
      // 定义成功回调函数,调用后:1.切换返回的实例状态为resolve 2.存储成功的value 3.依次执行该实例所对应的每一个onResolved
      function resolve(value) {
        if (self.status !== PENDING) return
        self.status = RESOLVED
        self.data = value
        self.callbacks.forEach(callbackObj => {
          setTimeout(() => {
            callbackObj.onResolved()
          })
        });
      }
      // 定义失败回调函数,调用后:1.切换返回的实例状态为reject 2.存储成功的原因reason 3.依次执行该实例所对应的每一个onRejected
      function reject(reason) {
        if (self.status !== PENDING) return
        self.status = REJECTED
        self.data = reason
        self.callbacks.forEach(callbackObj => {
          setTimeout(() => {
            callbackObj.onRejected()
          })
        });
      }
      executor(resolve, reject)
    }

    // 定义Promise原型上的then方法,用于执行实例状态成功或者失败的回调
    //Promise原型对象上的then
    /*
     * 一、then方法能做什么？
     *     1.如果调用then的时候，Promise实例状态已经为resolved，去执行onResolved回调。
     *     2.如果调用then的时候，Promise实例状态已经为rejected，去执行onRejected回调。
     *     3.如果调用then的时候，Promise实例状态为pending，将onResolved于onRejected保存起来。
     *
     * 二、then的返回值是什么？
     *     返回的是Promise的实例对象，返回的这个Promise实例对象的状态、数据如何确定？
     *       1.如果then所指定的回调执行时抛出了异常，then返回的那个Promise实例状态为：rejected，reason是该异常。
     *       2.如果then所指定的回调返回值是一个非Promise类型，then返回的那个Promise实例状态为：resolved，value是该返回值。
     *       3.如果then所指定的回调返回值是一个Promise实例，then返回的那个Promise实例状态、数据与之一致。
     * */
    then(onResolved, onRejected) {
      const self = this
      //保证catch的传递功能
      onResolved = typeof onResolved === 'function' ? onResolved : value => value
      //保证Promoise的错误穿透功能
      onRejected = typeof onRejected === 'function' ? onRejected : reason => {
        throw reason
      }

      return new Promise((resolve, reject) => {

        // 封装函数专门处理返回的promise实例的状态
        function handle(target) {
          try {
            let result = target(self.data)
            //如果返回值不是一个promise的实例,那么返回成功实例,并且value就是这个返回值
            if (!(result instanceof Promise)) {
              resolve(result)
            }
            // result是一个promise实例
            else {
              // result.then(
              //     value => resolve(value),
              //     reason => reject(reason)
              // )
              result.then(resolve, reject)
            }
          } catch (error) {
            reject(error)
          }
        }

        // 如果调用then时，已经有人修改Promise的实例状态为resolved了,那么应该直接执行成功回调,不向callbacks中保存回调函数了
        if (self.status === RESOLVED) {
          setTimeout(() => {
            handle(onResolved)
          })
        }
        // 如果调用then时，已经有人修改Promise的实例状态为rejected了,那么应该直接执行失败回调,不向callbacks中保存回调函数了
        else if (self.status === REJECTED) {
          setTimeout(() => {
            handle(onRejected)
          })
        }
        //如果调用then时,状态仍为pending,则将then方法中的回调函数保存起来,等待状态改变后执行
        else {
          self.callbacks.push({
            onResolved: () => {
              handle(onResolved)
            },
            onRejected: () => {
              handle(onRejected)
            }
          })
        }

      })
    }

    catch (onRejected) {
      const self = this
      return self.then(null, onRejected)
    }

    // Promise.resolve方法: Promisw.resolve(value)
    // value可以为： 1. 成功的数据。 2. 一个新的Promise实例。
    // 说明: 用于快速返回一个状态为resolved或rejected的Promise实例对象
    static resolve(value) {
      return new Promise((resolve, reject) => {
        value instanceof Promise ? value.then(resolve, reject) : resolve(value)
      })
    }

    /* Promise.reject方法: Promise.reject方法(reason) 
    reason为失败的原因
    说明: 返回一个失败的Promise实例对象 */
    static reject(reason) {
      return new Promise((resolve, reject) => {
        reject(reason)
      })
    }

    /* Promise.all方法: Promise.all(promiseArr)
    promiseArr: 包含n个Promise实例的数组
    说明: 返回一个新的Promise实例, 只有所有的promise都成功才成功, 只要有一个失败了就直接失败 */
    static all(promiseArr) {
      return new Promise((resolve, reject) => {
        let resolvedCount = 0 //计数器记录成功的个数
        let resultArr = [] //定义好一个数组,用于保存每一个实例成功的结果
        // promiseArr.forEach(promiseObj => {
        //     if (promiseObj.status === RESOLVED) {
        //         count++
        //     } else {
        //         reject(promiseObj.data)
        //     }
        // })
        // if (count === promiseArr.length) {
        //     let arr = []
        //     promiseArr.forEach(promiseObj => {
        //         arr.push(promiseObj.data)
        //     })
        //     resolve(arr)
        // }
        promiseArr.forEach((promiseObj, index) => {
          // 利用已经定义好的Promise.resolve()判断promiseObj状态并执行相关函数
          Promise.resolve(promiseObj).then(
            value => {
              resolvedCount++
              resultArr[index] = value
              if (promiseArr.length === resolvedCount) resolve(resultArr)
            },
            reason => {
              reject(reason)
            }
          )
        })


      })
    }

    /*  Promise.race方法: Promise.race(promiseArr)
    promiseArr: 包含n个Promise实例的数组
    说明: 返回一个新的Promise实例,最先出结果的promise的结果状态就是最终的结果状态 */
    static race(promiseArr) {
      return new Promise((resolve, reject) => {
        promiseArr.forEach((promiseObj) => {
          Promise.resolve(promiseObj).then(resolve, reject)
        })
      })
    }

    // 补充:
    //延迟指定时间返回一个Promise实例，该实例的状态、值与Promise.resolve规则一样
    static resolveDelay(value, time) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          value instanceof Promise ? value.then(resolve, reject) : resolve(value)
        }, time)
      })
    }

    //延迟指定时间返回一个失败的Promise实例
    static rejectDelay(reason, time) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          reject(reason)
        }, time)
      })
    }
  }
  window.Promise = Promise
})()