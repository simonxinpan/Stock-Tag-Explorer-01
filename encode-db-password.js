// 数据库密码URL编码工具
// 用于处理Neon数据库连接字符串中的特殊字符

function encodePassword(password) {
  // URL编码特殊字符
  return password
    .replace(/@/g, '%40')  // @ -> %40
    .replace(/#/g, '%23')  // # -> %23
    .replace(/\?/g, '%3F') // ? -> %3F
    .replace(/\//g, '%2F') // / -> %2F
    .replace(/%/g, '%25')  // % -> %25 (注意：这个要最后处理，避免重复编码)
    .replace(/\+/g, '%2B') // + -> %2B
    .replace(/&/g, '%26')  // & -> %26
    .replace(/=/g, '%3D'); // = -> %3D
}

function buildConnectionString(username, password, host, database = 'neondb') {
  const encodedPassword = encodePassword(password);
  return `postgresql://${username}:${encodedPassword}@${host}/${database}?sslmode=require`;
}

// 如果直接运行此脚本
if (require.main === module) {
  console.log('🔧 数据库密码URL编码工具');
  console.log('');
  
  // 示例用法
  const examplePassword = 'mypass@word#123';
  const encodedExample = encodePassword(examplePassword);
  
  console.log('示例：');
  console.log('原始密码:', examplePassword);
  console.log('编码后密码:', encodedExample);
  console.log('');
  
  console.log('完整连接字符串示例：');
  const exampleConnectionString = buildConnectionString(
    'myuser', 
    examplePassword, 
    'ep-abc-123.us-east-1.aws.neon.tech'
  );
  console.log(exampleConnectionString);
  console.log('');
  
  console.log('使用方法：');
  console.log('1. 将您的真实用户名、密码、主机地址替换到 .env 文件中');
  console.log('2. 使用此工具编码您的密码');
  console.log('3. 将编码后的密码更新到连接字符串中');
}

module.exports = { encodePassword, buildConnectionString };