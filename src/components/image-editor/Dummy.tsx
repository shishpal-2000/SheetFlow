const dummyArrayData = ["shishpal", 23, 45];
const key = ["studentName", "age", "class"];

const gloabalObject = dummyArrayData.reduce((acc, element, index) => {
  return {
    ...acc,
    [key[index]]: element,
  };
}, {});

console.log(gloabalObject);
