class learing {
  constructor(name, age, gender) {
    this.name = name;
    this.age = age;
    this.gender = gender;
  }
  checkinfo() {
    console.log(
      `He is ${this.name}, his age is ${this.age}, and he's ${this.gender}`
    );
  }
  doMath() {
    let length = this.name.length;
    let number = this.age;
    console.log(length + number);
  }
}
const experiment = new learing("David", 22, "male");
experiment.checkinfo();
experiment.doMath();
